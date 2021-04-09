import * as _ from 'lodash';
import {
  DeploymentConfigModel,
  DeploymentModel,
  ImageStreamModel,
  ServiceModel,
  RouteModel,
} from '@console/internal/models';
import {
  K8sResourceKind,
  K8sVerb,
  k8sCreate,
  k8sUpdate,
  k8sWaitForUpdate,
} from '@console/internal/module/k8s';
import { ServiceModel as KnServiceModel } from '@console/knative-plugin';
import { getKnativeServiceDepResource } from '@console/knative-plugin/src/utils/create-knative-utils';
import { getRandomChars, getResourceLimitsData } from '@console/shared/src/utils';
import {
  getAppLabels,
  getPodLabels,
  mergeData,
  getCommonAnnotations,
  getTriggerAnnotation,
} from '../../utils/resource-label-utils';
import { createRoute, createService, dryRunOpt } from '../../utils/shared-submit-utils';
import { getProbesData } from '../health-checks/create-health-checks-probe-utils';
import { RegistryType } from '../../utils/imagestream-utils';
import { AppResources } from '../edit-application/edit-application-types';
import { DeployImageFormData, Resources } from './import-types';

const WAIT_FOR_IMAGESTREAM_UPDATE_TIMEOUT = 5000;
const WAIT_FOR_IMAGESTREAM_GENERATION = 2;

export const createOrUpdateImageStream = async (
  formData: DeployImageFormData,
  dryRun: boolean,
  originalImageStream?: K8sResourceKind,
  verb: K8sVerb = 'create',
  generatedImageStreamName: string = '',
): Promise<K8sResourceKind> => {
  const {
    project: { name: namespace },
    application: { name: applicationName },
    name,
    allowInsecureRegistry,
    isi: { name: isiName, tag },
    labels: userLabels,
  } = formData;
  const defaultLabels = getAppLabels({ name, applicationName });
  const newImageStream = {
    apiVersion: 'image.openshift.io/v1',
    kind: 'ImageStream',
    metadata: {
      name: `${generatedImageStreamName || name}`,
      namespace,
      labels: { ...defaultLabels, ...userLabels },
    },
    spec: {
      tags: [
        {
          name: tag,
          annotations: {
            ...getCommonAnnotations(),
            'openshift.io/imported-from': isiName,
          },
          from: {
            kind: 'DockerImage',
            name: `${isiName}`,
          },
          importPolicy: { insecure: allowInsecureRegistry },
          referencePolicy: { type: 'Local' },
        },
      ],
    },
  };

  if (verb === 'update') {
    const mergedImageStream = mergeData(originalImageStream, newImageStream);
    return k8sUpdate(ImageStreamModel, mergedImageStream);
  }
  const createdImageStream = await k8sCreate(
    ImageStreamModel,
    newImageStream,
    dryRun ? dryRunOpt : {},
  );
  if (dryRun) {
    return createdImageStream;
  }
  return k8sWaitForUpdate(
    ImageStreamModel,
    createdImageStream,
    (imageStream) => imageStream.metadata.generation >= WAIT_FOR_IMAGESTREAM_GENERATION,
    WAIT_FOR_IMAGESTREAM_UPDATE_TIMEOUT,
  ).catch(() => createdImageStream);
};

const getMetadata = (formData: DeployImageFormData) => {
  const {
    application: { name: applicationName },
    name,
    isi: { image },
    labels: userLabels,
    imageStream: { image: imageStreamName, tag: selectedTag, namespace },
    runtimeIcon,
  } = formData;
  const defaultLabels = getAppLabels({
    name,
    applicationName,
    imageStreamName,
    runtimeIcon,
    selectedTag,
    namespace,
  });
  const labels = { ...defaultLabels, ...userLabels };
  const podLabels = getPodLabels(name);

  const volumes = [];
  const volumeMounts = [];
  let volumeNumber = 0;
  _.each(_.get(image, ['dockerImageMetadata', 'Config', 'Volumes']), (value, path) => {
    volumeNumber++;
    const volumeName = `${name}-${volumeNumber}`;
    volumes.push({
      name: volumeName,
      emptyDir: {},
    });
    volumeMounts.push({
      name: volumeName,
      mountPath: path,
    });
  });

  return { labels, podLabels, volumes, volumeMounts };
};

export const createOrUpdateDeployment = (
  formData: DeployImageFormData,
  dryRun: boolean,
  originalDeployment?: K8sResourceKind,
  verb: K8sVerb = 'create',
): Promise<K8sResourceKind> => {
  const {
    registry,
    project: { name: namespace },
    name,
    isi: { image, ports, tag: imageStreamTag },
    deployment: {
      env,
      replicas,
      triggers: { image: imageChange },
    },
    labels: userLabels,
    limits: { cpu, memory },
    imageStream: { image: imgName, namespace: imgNamespace },
    healthChecks,
  } = formData;

  const annotations = getCommonAnnotations();
  const defaultAnnotations = {
    ...annotations,
    'alpha.image.policy.openshift.io/resolve-names': '*',
    ...getTriggerAnnotation(
      name,
      imgName || name,
      imgNamespace || namespace,
      imageChange,
      imageStreamTag,
    ),
  };

  const { labels, podLabels, volumes, volumeMounts } = getMetadata(formData);

  const imageRef =
    registry === RegistryType.External
      ? `${name}:${imageStreamTag}`
      : _.get(image, 'dockerImageReference');

  const newDeployment = {
    kind: 'Deployment',
    apiVersion: 'apps/v1',
    metadata: {
      name,
      namespace,
      labels,
      annotations: defaultAnnotations,
    },
    spec: {
      replicas,
      selector: {
        matchLabels: {
          app: name,
        },
      },
      template: {
        metadata: {
          labels: { ...userLabels, ...podLabels },
          annotations,
        },
        spec: {
          volumes,
          containers: [
            {
              name,
              image: imageRef,
              ports,
              volumeMounts,
              env,
              resources: getResourceLimitsData({ cpu, memory }),
              ...getProbesData(healthChecks),
            },
          ],
        },
      },
    },
  };

  const deployment = mergeData(originalDeployment, newDeployment);

  return verb === 'update'
    ? k8sUpdate(DeploymentModel, deployment)
    : k8sCreate(DeploymentModel, deployment, dryRun ? dryRunOpt : {});
};

export const createOrUpdateDeploymentConfig = (
  formData: DeployImageFormData,
  dryRun: boolean,
  originalDeploymentConfig?: K8sResourceKind,
  verb: K8sVerb = 'create',
): Promise<K8sResourceKind> => {
  const {
    project: { name: namespace },
    name,
    isi: { image, tag, ports },
    deployment: { env, replicas, triggers },
    labels: userLabels,
    limits: { cpu, memory },
    imageStream: { image: imgName, namespace: imgNamespace },
    healthChecks,
  } = formData;

  const { labels, podLabels, volumes, volumeMounts } = getMetadata(formData);
  const annotations = getCommonAnnotations();
  const newDeploymentConfig = {
    kind: 'DeploymentConfig',
    apiVersion: 'apps.openshift.io/v1',
    metadata: {
      name,
      namespace,
      labels,
      annotations,
    },
    spec: {
      replicas,
      selector: podLabels,
      template: {
        metadata: {
          labels: { ...userLabels, ...podLabels },
          annotations,
        },
        spec: {
          volumes,
          containers: [
            {
              name,
              image: _.get(image, ['dockerImageMetadata', 'Config', 'Image']),
              ports,
              volumeMounts,
              env,
              resources: getResourceLimitsData({ cpu, memory }),
              ...getProbesData(healthChecks),
            },
          ],
        },
      },
      triggers: [
        {
          type: 'ImageChange',
          imageChangeParams: {
            automatic: triggers.image,
            containerNames: [name],
            from: {
              kind: 'ImageStreamTag',
              name: `${imgName || name}:${tag}`,
              namespace: imgNamespace || namespace,
            },
          },
        },
        ...(triggers.config ? [{ type: 'ConfigChange' }] : []),
      ],
    },
  };

  const deploymentConfig = mergeData(originalDeploymentConfig, newDeploymentConfig);

  return verb === 'update'
    ? k8sUpdate(DeploymentConfigModel, deploymentConfig)
    : k8sCreate(DeploymentConfigModel, deploymentConfig, dryRun ? dryRunOpt : {});
};

export const ensurePortExists = (formData: DeployImageFormData): DeployImageFormData => {
  const {
    isi: { ports },
    route: { defaultUnknownPort, unknownTargetPort },
  } = formData;

  let values = formData;
  if (!Array.isArray(ports) || ports.length === 0) {
    // If we lack pre-defined ports but they have specified a custom target port, use that instead
    const containerPort = unknownTargetPort ? parseInt(unknownTargetPort, 10) : defaultUnknownPort;
    const suppliedPorts = [{ containerPort, protocol: 'TCP' }];

    values = {
      ...values,
      isi: {
        ...values.isi,
        ports: suppliedPorts,
      },
    };
  }

  return values;
};

export const createOrUpdateDeployImageResources = async (
  rawFormData: DeployImageFormData,
  dryRun: boolean = false,
  verb: K8sVerb = 'create',
  appResources?: AppResources,
): Promise<K8sResourceKind[]> => {
  const formData = ensurePortExists(rawFormData);
  const {
    name,
    registry,
    project: { name: namespace },
    route: { create: canCreateRoute, disable },
    isi: { ports, tag: imageStreamTag, image },
    imageStream: { image: internalImageStreamName, namespace: internalImageStreamNamespace },
    deployment: {
      triggers: { image: imageChange },
    },
  } = formData;
  const requests: Promise<K8sResourceKind>[] = [];

  const imageStreamList = appResources?.imageStream?.data;
  const imageStreamData = _.orderBy(imageStreamList, ['metadata.resourceVersion'], ['desc']);
  const originalImageStream = (imageStreamData.length && imageStreamData[0]) || {};
  if (formData.resources !== Resources.KnativeService) {
    registry === RegistryType.External &&
      (await createOrUpdateImageStream(formData, dryRun, originalImageStream, verb));
    if (formData.resources === Resources.Kubernetes) {
      requests.push(
        createOrUpdateDeployment(
          formData,
          dryRun,
          _.get(appResources, 'editAppResource.data'),
          verb,
        ),
      );
    } else {
      requests.push(
        createOrUpdateDeploymentConfig(
          formData,
          dryRun,
          _.get(appResources, 'editAppResource.data'),
          verb,
        ),
      );
    }
    if (!_.isEmpty(ports)) {
      const originalService = appResources?.service?.data;
      const service = createService(formData, undefined, originalService);
      const request =
        verb === 'update'
          ? !_.isEmpty(originalService)
            ? k8sUpdate(ServiceModel, service)
            : null
          : k8sCreate(ServiceModel, service, dryRun ? dryRunOpt : {});
      requests.push(request);
      const route = createRoute(formData, undefined, _.get(appResources, 'route.data'));
      if (verb === 'update' && disable) {
        requests.push(k8sUpdate(RouteModel, route));
      } else if (canCreateRoute) {
        requests.push(k8sCreate(RouteModel, route, dryRun ? dryRunOpt : {}));
      }
    }
  } else if (!dryRun) {
    // Do not run serverless call during the dry run.
    let imageStreamUrl: string = image?.dockerImageReference;
    if (registry === RegistryType.External) {
      let generatedImageStreamName: string = '';
      if (verb === 'update') {
        if (imageStreamList && imageStreamList.length) {
          const originalImageStreamTag = _.find(originalImageStream?.status?.tags, [
            'tag',
            imageStreamTag,
          ]);
          if (!_.isEmpty(originalImageStreamTag)) {
            generatedImageStreamName = `${name}-${getRandomChars()}`;
          }
        } else {
          generatedImageStreamName = `${name}-${getRandomChars()}`;
        }
      }
      const imageStreamResponse = await createOrUpdateImageStream(
        formData,
        dryRun,
        originalImageStream,
        generatedImageStreamName ? 'create' : verb,
        generatedImageStreamName,
      );
      const imageStreamRepo = imageStreamResponse.status.dockerImageRepository;
      imageStreamUrl = imageStreamTag ? `${imageStreamRepo}:${imageStreamTag}` : imageStreamRepo;
    }
    const originalAnnotations = appResources?.editAppResource?.data?.metadata?.annotations || {};
    const triggerAnnotations = getTriggerAnnotation(
      name,
      internalImageStreamName || name,
      internalImageStreamNamespace || namespace,
      imageChange,
      imageStreamTag,
    );
    const annotations = {
      ...originalAnnotations,
      ...triggerAnnotations,
    };
    const knDeploymentResource = getKnativeServiceDepResource(
      formData,
      imageStreamUrl,
      internalImageStreamName || name,
      imageStreamTag,
      internalImageStreamNamespace,
      annotations,
      _.get(appResources, 'editAppResource.data'),
    );
    requests.push(
      verb === 'update'
        ? k8sUpdate(KnServiceModel, knDeploymentResource)
        : k8sCreate(KnServiceModel, knDeploymentResource),
    );
  }

  return Promise.all(requests);
};
