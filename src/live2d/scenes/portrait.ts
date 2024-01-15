import { Live2dViewer } from "live2dmanager";

export function drawLive2dPortrait(live2dViewer: Live2dViewer): void {
  const loop = () => {
    const gl = live2dViewer.gl;
    if (gl == undefined) {
      return;
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
    if (live2dViewer._models[live2dViewer.targetCurrentModelKey] == undefined) {
      return;
    }

    const projection = live2dViewer.getNewMatrix44();

    const model = live2dViewer._models[live2dViewer.targetCurrentModelKey];
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
        model.draw(projection, width, height, live2dViewer.frameBuffer);
      }
    };

    if (model != undefined && model.isCompleteSetup) {
      draw();
    }

    requestAnimationFrame(loop);
  };

  loop();
}
