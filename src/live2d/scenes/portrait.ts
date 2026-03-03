async function getTypes(isFailedLive2dLoadCore: boolean) {
  if (isFailedLive2dLoadCore) return undefined;

  const { Live2dManager, Live2dViewer, Live2dModel, Live2dMotionSyncModel } =
    await import("live2dmanager")
      .then((m) => {
        return {
          Live2dManager: m.Live2dManager,
          Live2dViewer: m.Live2dViewer,
          Live2dModel: m.Live2dModel,
          Live2dMotionSyncModel: m.Live2dMotionSyncModel,
        };
      })
      .catch((e) => {
        window.backend.logError(e);
        return {
          Live2dManager: undefined,
          Live2dViewer: undefined,
          Live2dModel: undefined,
          Live2dMotionSyncModel: undefined,
        };
      });

  if (
    Live2dManager == undefined ||
    Live2dViewer == undefined ||
    Live2dModel == undefined ||
    Live2dMotionSyncModel == undefined
  )
    return undefined;

  return { Live2dManager, Live2dViewer, Live2dModel, Live2dMotionSyncModel };
}

export async function sceneOfPortrait(
  live2dViewer: unknown,
  isFailedLive2dLoadCore: boolean,
) {
  const live2dTypes = await getTypes(isFailedLive2dLoadCore);
  if (live2dTypes == undefined) return;
  const Live2dViewer = live2dTypes.Live2dViewer;
  const Live2dModel = live2dTypes.Live2dModel;
  const Live2dMotionSyncModel = live2dTypes.Live2dMotionSyncModel;
  if (
    Live2dViewer == undefined ||
    !(live2dViewer instanceof Live2dViewer) ||
    Live2dModel == undefined ||
    Live2dMotionSyncModel == undefined
  ) {
    return;
  }
  const { width, height } = live2dViewer.canvas;

  const projection = live2dViewer.getNewMatrix44();

  const key = live2dViewer.getCurrentModelKey();
  const model = live2dViewer.getModelFromKey(key);
  if (model == undefined) {
    // window.backend.logError("target Live2D Model is undefined");
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
