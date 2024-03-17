import { Live2dModel, Live2dViewer } from "live2dmanager";

// that return value is handle of requestAnimationFrame. That is for cancelAnimationFrame function.
export function drawLive2dPortrait(live2dViewer: Live2dViewer): number {
  const loop = (): number => {
    const gl = live2dViewer.gl;
    if (gl == undefined) {
      return 0;
    }

    live2dViewer.updateTime();

    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.clearDepth(1.0);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    if (live2dViewer._programId) {
      gl.useProgram(live2dViewer._programId);
    }
    gl.flush();

    const { width, height } = live2dViewer.canvas;

    const projection = live2dViewer.getNewMatrix44();

    const model: Live2dModel | undefined = live2dViewer.getModelFromKey(
      live2dViewer.getCurrentModelKey()
    );
    if (model == undefined) {
      window.backend.logError("target Live2D Model is undefined");
      return 0;
    }
    // console.log(`in draw: ${live2dViewer.getCurrentModelKey()}`);
    const draw = () => {
      if (model.getModel()) {
        if (model.getModel().getCanvasWidth() > 1.0 && width < height) {
          model.getModelMatrix().setWidth(2.0);
          projection.scale(1.0, width / height);
        } else {
          projection.scale(height / width, 1.0);
        }

        projection.multiplyByMatrix(live2dViewer._viewMatrix);

        model.update();
        model.draw(projection, 0, 0, width, height, live2dViewer.frameBuffer);
      }
    };

    if (model != undefined && model.isCompleteSetup) {
      draw();
    }

    return requestAnimationFrame(loop);
  };

  return loop();
}
