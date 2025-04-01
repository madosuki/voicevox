import {
  Live2dModel,
  Live2dMotionSyncModel,
  Live2dViewer,
} from "live2dmanager";

export function sceneOfPortrait(live2dViewer: Live2dViewer) {
  const { width, height } = live2dViewer.canvas;

  const projection = live2dViewer.getNewMatrix44();

  const key = live2dViewer.getCurrentModelKey();
  const model: Live2dModel | Live2dMotionSyncModel | undefined =
    live2dViewer.getModelFromKey(key);
  if (model == undefined) {
    window.backend.logError("target Live2D Model is undefined");
    return;
  }

  const draw = () => {
    if (model.getModel()) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      if (model.getModel().getCanvasWidth() > 1.0 && width < height) {
        model.getModelMatrix().setWidth(2.0);
        projection.scale(1.0, width / height);
      } else {
        projection.scale(height / width, 1.0);
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      projection.multiplyByMatrix(live2dViewer._viewMatrix);

      model.update();
      model.draw(projection, 0, 0, width, height, live2dViewer.frameBuffer);
    }
  };

  if (model != undefined && model.isCompleteSetup) {
    draw();
  }
}
