import * as React from 'react';
import { connect } from 'react-redux';
import { Button } from '@patternfly/react-core';
import { useAccessReview } from '@console/internal/components/utils';
import { AccessReviewResourceAttributes } from '@console/internal/module/k8s';
import { impersonateStateToProps } from '@console/internal/reducers/ui';
import { PipelineRunModel } from '../../../models';
import { Pipeline } from '../../../utils/pipeline-augment';
import { startPipelineModal } from '../modals';

type StateProps = {
  impersonate?: {
    kind: string;
    name: string;
    subprotocols: string[];
  };
};

type PipelineStartButtonProps = {
  pipeline: Pipeline;
  namespace: string;
};

const PipelineStartButton: React.FC<PipelineStartButtonProps & StateProps> = ({
  pipeline,
  namespace,
  impersonate,
}) => {
  const openPipelineModal = () =>
    startPipelineModal({
      pipeline,
      modalClassName: 'modal-lg',
    });
  const defaultAccessReview: AccessReviewResourceAttributes = {
    group: PipelineRunModel.apiGroup,
    resource: PipelineRunModel.plural,
    namespace,
    verb: 'create',
  };
  const isAllowed = useAccessReview(defaultAccessReview, impersonate);

  return (
    isAllowed && (
      <Button variant="secondary" onClick={openPipelineModal}>
        Start
      </Button>
    )
  );
};

export default connect(impersonateStateToProps)(PipelineStartButton);
