import { addOptions, gitAdvancedOptions, buildConfigOptions } from '../../constants/add';
import { detailsPage } from '../../../../../integration-tests-cypress/views/details-page';

export const addPageObj = {
  cardTitle: 'div.catalog-tile-pf-title',
  sectionTitle: '.odc-form-section__heading',
  gitRepoUrl: '[data-test-id="git-form-input-url"]',
  nodeName: '[data-test-id="application-form-app-name"]',
  appName: '[id$=application-name-field]',
  create: '[data-test-id="submit-button"]',
  cancel: '[data-test-id="reset-button"]',
  gitSection: {
    validatedMessage: '[id$="git-url-field-helper"]',
  },
  builderSection: {
    builderImageDetected: '[aria-label="Success Alert"]',
    builderImageVersion: '#form-dropdown-image-tag-field',
    unableToDetectBuilderImage: '[aria-label="Warning Alert"]',
  },
  pipeline: {
    infoMessage: '[aria-label="Info Alert"]',
    addPipeline: '#form-checkbox-pipeline-enabled-field',
  },
  resources: {
    deployment: '#form-radiobutton-resources-kubernetes-field',
    deploymentConfig: '#form-radiobutton-resources-openshift-field',
    knative: '#form-radiobutton-resources-knative-field',
  },
  advancedOptions: {
    createRoute: '#form-checkbox-route-create-field',
    routing: {
      hostname: '#form-input-route-hostname-field',
      path: '#form-input-route-path-field',
      targetPort: '#form-input-route-unknownTargetPort-field',
      // targetPort: 'button#form-dropdown-route-targetPort-field',
      secureRoute: 'input#form-checkbox-route-secure-field',
      tlsTermination: 'button#form-dropdown-route-tls-termination-field',
      insecureTraffic: 'button#form-dropdown-route-tls-insecureEdgeTerminationPolicy-field',
    },
    buildConfig: {
      webHookBuildTrigger: 'input#form-checkbox-build-triggers-webhook-field',
      buildTriggerImage: 'input#form-checkbox-build-triggers-image-field',
      buildTriggerConfigField: 'input#form-checkbox-build-triggers-config-field',
      // Add Environment Value
      envName: 'input[placeholder="name"]',
      envValue: 'input[placeholder="value"]',
      // Count for Rows in Environment Variables section
      envRows: 'div.row.pairs-list__row',
      deleteRowButton: 'button[data-test-id="pairs-list__delete-btn"]',
    },
    deployment: {
      deploymentTriggerImage: 'input#form-checkbox-deployment-triggers-image-field',
      deploymentImageConfig: 'input#form-checkbox-deployment-triggers-config-field',
      envName: 'input[placeholder="name"]',
      envValue: 'input[placeholder="value"]',
      // Count for Rows in Environment Variables section
      envRows: 'div.row.pairs-list__row',
      deleteRowButton: 'button[data-test-id="pairs-list__delete-btn"]',
    },
    scaling: {
      decrement: 'button[aria-label="Decrement"]',
      increment: 'button[aria-label="Increment"]',
      replicaCount: 'input#form-number-spinner-deployment-replicas-field',
    },
    resourceLimit: {
      cpuRequest: 'input[name="limits.cpu.requestValue"]',
      cpuLimit: 'input[name="limits.cpu.limitValue"]',
      memoryRequest: 'input[name="limits.memory.requestValue"]',
      memoryLimit: 'input[name="limits.memory.limitValue"]',
      cpuRequestHelperText: 'div#form-resource-limit-limits-cpu-request-field-helper',
      cpuLimiHelperText: 'div#form-resource-limit-limits-cpu-limit-field-helper',
      memoryRequestHelperText: 'div#form-resource-limit-limits-memory-request-field-helper',
      memoryLimitHelperText: 'div#form-resource-limit-limits-memory-limit-field-helper',
    },
    labels: 'input#tags-input',
  },
};

export const addPage = {
  unselectRoute: () => cy.get(addPageObj.advancedOptions.createRoute).uncheck(),
  verifyNoWorkLoadsText: (text: string) =>
    cy.get('h2.co-hint-block__title').should('contain.text', text),
  verifyTitle: (title: string) => detailsPage.titleShouldContain(title),
  verifyPipelinesSection: (message: string) => {
    cy.get('body').scrollTo('bottom');
    cy.get(addPageObj.sectionTitle)
      .contains('Pipelines')
      .should('be.visible');
    cy.get(addPageObj.pipeline.infoMessage).should('have.text', message);
  },
  enterGitUrl: (gitUrl: string) => cy.get(addPageObj.gitRepoUrl).type(gitUrl),
  verifyPipelineCheckBox: () => cy.get(addPageObj.pipeline.addPipeline).should('be.visible'),
  enterAppName: (appName: string) => {
    cy.get(addPageObj.appName).then(($el) => {
      if ($el.prop('tagName').includes('button')) {
        cy.get(addPageObj.appName).click();
        cy.get(`li #${appName}-link`).click();
      } else if ($el.prop('tagName').includes('input')) {
        cy.get(addPageObj.appName)
          .scrollIntoView()
          .clear()
          .should('be.empty', { timeout: 3000 })
          .type(appName)
          .should('have.value', appName);
      } else {
        cy.log(`App name doesn't contain button or input tags`);
      }
    });
  },
  veirfyAppName: (nodeName: string) => cy.get(addPageObj.appName).should('have.value', nodeName),
  enterComponentName: (name: string) => {
    cy.get(addPageObj.nodeName)
      .scrollIntoView()
      .clear();
    cy.get(addPageObj.nodeName)
      .scrollIntoView()
      .type(name);
    cy.get(addPageObj.nodeName).should('have.value', name);
  },
  veirfyNodeName: (componentName: string) =>
    cy.get(addPageObj.nodeName).should('have.value', componentName),
  selectResource: (resource: string = 'deployment') => {
    switch (resource) {
      case 'deployment':
      case 'Deployment':
        cy.get(addPageObj.resources.deployment)
          .scrollIntoView()
          .check();
        break;
      case 'deployment config':
      case 'Deployment Config':
        cy.get(addPageObj.resources.deploymentConfig)
          .scrollIntoView()
          .check();
        break;
      case 'Knative':
      case 'knative':
      case 'Knative Service':
        cy.get(addPageObj.resources.knative)
          .scrollIntoView()
          .check();
        break;
      default:
        throw new Error('Resource option is not available');
        break;
    }
  },
  selectAdvancedOptions: (opt: gitAdvancedOptions) => {
    switch (opt) {
      case gitAdvancedOptions.Routing:
        cy.byButtonText('Routing').click();
        break;
      case gitAdvancedOptions.BuildConfig:
        cy.byButtonText('Build Configuration').click();
        break;
      case gitAdvancedOptions.Deployment:
        cy.byButtonText('Deployment').click();
        break;
      case gitAdvancedOptions.Scaling:
        cy.byButtonText('Scaling').click();
        break;
      case gitAdvancedOptions.ResourceLimits:
        cy.byButtonText('Resource Limits').click();
        break;
      case gitAdvancedOptions.Labels:
        cy.byButtonText('Labels').click();
        break;
      case gitAdvancedOptions.HealthChecks:
        cy.byButtonText('Health Checks').click();
        break;
      default:
        throw new Error('Advanced option is not available');
        break;
    }
  },
  selectCardFromOptions: (card: addOptions | string) => {
    switch (card) {
      case 'Git':
      case addOptions.Git:
        cy.byLegacyTestID('import-from-git').click();
        detailsPage.titleShouldContain('Import from git');
        break;
      case 'Deploy Image':
      case addOptions.ContainerImage:
        cy.byLegacyTestID('deploy-image').click();
        detailsPage.titleShouldContain('Deploy Image');
        break;
      case 'Import from Dockerfile':
      case addOptions.DockerFile:
        cy.byLegacyTestID('import-from-dockerfile').click();
        detailsPage.titleShouldContain('Import from Dockerfile');
        break;
      case 'Developer Catalog':
      case 'From Catalog':
      case addOptions.DeveloperCatalog:
        cy.byLegacyTestID('dev-catalog').click();
        detailsPage.titleShouldContain('Developer Catalog');
        break;
      case 'Database':
      case addOptions.Database:
        cy.byLegacyTestID('dev-catalog-databases').click();
        detailsPage.titleShouldContain('Developer Catalog');
        break;
      case 'Event Source':
      case addOptions.EventSource:
        cy.byLegacyTestID('knative-event-source').click();
        detailsPage.titleShouldContain('Event Sources');
        break;
      case 'Helm Chart':
      case addOptions.HelmChart:
        cy.byLegacyTestID('helm').click();
        detailsPage.titleShouldContain('Developer Catalog');
        cy.byTestID('kind-helm-chart').should('be.checked');
        break;
      case 'Operator Backed':
      case addOptions.OperatorBacked:
        cy.byLegacyTestID('operator-backed').click();
        detailsPage.titleShouldContain('Developer Catalog');
        cy.byTestID('kind-cluster-service-version').should('be.checked');
        break;
      case 'Pipelines':
      case addOptions.Pipeline:
        cy.byLegacyTestID('pipeline').click();
        cy.get('h1.odc-pipeline-builder-header__title').should('have.text', 'Pipeline Builder');
        break;
      case 'Yaml':
      case addOptions.YAML:
        cy.byLegacyTestID('import-yaml').click();
        cy.get('[data-mode-id="yaml"]').should('be.visible');
        break;
      default:
        throw new Error(`Unable to find the "${card}" card on Add page`);
    }
  },
  selectAddPipeline: () =>
    cy
      .get(addPageObj.pipeline.addPipeline)
      .scrollIntoView()
      .check(),
  clickCreate: () =>
    cy
      .get(addPageObj.create)
      .should('be.enabled')
      .click(),
  clickCancel: () =>
    cy
      .get(addPageObj.cancel)
      .should('be.enabled')
      .click(),
  verifyValidatedMessage: () =>
    cy.get(addPageObj.gitSection.validatedMessage).should('have.text', 'Validated'),
  verifyBuilderImageDetectedMessage: () =>
    cy.get(addPageObj.builderSection.builderImageDetected).should('be.visible'),
  verifyBuilderImageVersion: () =>
    cy.get(addPageObj.builderSection.builderImageVersion).should('be.visible'),
  verifyCard: (cardName: string) =>
    cy
      .get(addPageObj.cardTitle)
      .contains(cardName)
      .should('be.visible'),
  createGitWorkload: (
    gitUrl: string = 'https://github.com/sclorg/nodejs-ex.git',
    componentName: string = 'nodejs-ex-git',
    resourceType: string = 'Deployment',
    appName: string = 'nodejs-ex-git-app',
  ) => {
    addPage.selectCardFromOptions(addOptions.Git);
    addPage.enterGitUrl(gitUrl);
    addPage.enterAppName(appName);
    addPage.enterComponentName(componentName);
    addPage.selectResource(resourceType);
    addPage.clickCreate();
  },
  selectTargetPortForRouting: () => {
    cy.get(addPageObj.advancedOptions.routing.targetPort).type('8080');
  },
  enterRoutingHostName: (hostName: string) =>
    cy.get(addPageObj.advancedOptions.routing.hostname).type(hostName),
  eneterRoutingPath: (path: string) => cy.get(addPageObj.advancedOptions.routing.path).type(path),
  uncheckBuildConfigOption: (checkBoxName: string | buildConfigOptions) => {
    switch (checkBoxName) {
      case buildConfigOptions.webhookBuildTrigger:
        cy.get(addPageObj.advancedOptions.buildConfig.webHookBuildTrigger)
          .should('be.visible')
          .uncheck();
        break;
      case buildConfigOptions.automaticBuildImage:
        cy.get(addPageObj.advancedOptions.buildConfig.buildTriggerImage)
          .should('be.visible')
          .uncheck();
        break;
      case buildConfigOptions.launchBuildOnCreatingBuildConfig:
        cy.get(addPageObj.advancedOptions.buildConfig.buildTriggerConfigField)
          .should('be.visible')
          .uncheck();
        break;
      default:
        throw new Error(
          `Unable to find the "${checkBoxName}" checbox in Build Configuration Section`,
        );
    }
  },
  enterBuildConfigEnvName: (envName: string) =>
    cy.get(addPageObj.advancedOptions.buildConfig.envName).type(envName),
  enterBuildConfigEnvValue: (envValue: string) =>
    cy.get(addPageObj.advancedOptions.buildConfig.envValue).type(envValue),
  verifyDeploymentOptionIsChecked: () => {
    cy.get('#form-checkbox-deployment-triggers-image-field').should('be.checked');
  },
  enterDeploymentEnvName: (envName: string) =>
    cy.get(addPageObj.advancedOptions.deployment.envName).type(envName),
  enterDeploymentEnvValue: (envValue: string) =>
    cy.get(addPageObj.advancedOptions.deployment.envValue).type(envValue),
  enterResourceLimitCPURequest: (cpuResquestValue: string) =>
    cy.get(addPageObj.advancedOptions.resourceLimit.cpuRequest).type(cpuResquestValue),
  enterResourceLimitCPULimit: (cpuLimitValue: string) =>
    cy.get(addPageObj.advancedOptions.resourceLimit.cpuLimit).type(cpuLimitValue),
  enterResourceLimitMemoryRequest: (memoryRequestValue: string) =>
    cy.get(addPageObj.advancedOptions.resourceLimit.memoryRequest).type(memoryRequestValue),
  enterResourceLimitMemoryLimit: (memoryLimitValue: string) =>
    cy.get(addPageObj.advancedOptions.resourceLimit.memoryLimit).type(memoryLimitValue),
  enterScalingReplicaCount: (replicaCount: string) =>
    cy.get(addPageObj.advancedOptions.scaling.replicaCount).type(replicaCount),
  enterLabels: (labelName: string) => cy.get(addPageObj.advancedOptions.labels).type(labelName),
};
