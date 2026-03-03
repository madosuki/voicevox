async function getTypes(isFailedLive2dLoadCore: boolean) {
  if (isFailedLive2dLoadCore) return undefined;

  const { Live2dViewer } = await import("live2dmanager")
    .then((m) => {
      return {
        Live2dViewer: m.Live2dViewer,
      };
    })
    .catch((e) => {
      window.backend.logError(e);
      return {
        Live2dViewer: undefined,
      };
    });

  if (Live2dViewer == undefined) return undefined;

  return { Live2dViewer };
}

export class Live2dSceneRenderer {
  private requestAnimationFrameHandler: number;
  constructor() {
    this.requestAnimationFrameHandler = 0;
  }

  async render(
    live2dViewer: unknown,
    scene: (
      live2dViewer: unknown,
      isFailedLive2dLoadCore: boolean,
    ) => Promise<void>,
    isFailedLive2dLoadCore: boolean,
  ): Promise<void> {
    const live2dTypes = await getTypes(isFailedLive2dLoadCore);
    if (live2dTypes == undefined) return;
    const Live2dViewer = live2dTypes.Live2dViewer;
    if (Live2dViewer == undefined || !(live2dViewer instanceof Live2dViewer)) {
      return;
    }

    const fps = 1000 / 60;
    let lastTime = performance.now();
    let isFirst = true;
    const loop = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      if (deltaTime <= fps && !isFirst) {
        this.requestAnimationFrameHandler = requestAnimationFrame((t: number) =>
          loop(t),
        );
        return;
      }
      if (isFirst) {
        isFirst = false;
      }
      lastTime = deltaTime;

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

      // requestAnimationFrameはunsigned long型な0以外の値なrequest idを返す． ref: https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame#return_value
      this.requestAnimationFrameHandler = requestAnimationFrame(loop);

      /*
      scene(live2dViewer, isFailedLive2dLoadCore).then(() => {
        // requestAnimationFrameはunsigned long型な0以外の値なrequest idを返す． ref: https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame#return_value
        this.requestAnimationFrameHandler = requestAnimationFrame(loop);
      })
      */
    };

    if (this.requestAnimationFrameHandler !== 0) {
      this.cancelRender();
    }

    this.requestAnimationFrameHandler = requestAnimationFrame(loop);
  }

  public cancelRender(): void {
    if (this.requestAnimationFrameHandler === 0) return;
    cancelAnimationFrame(this.requestAnimationFrameHandler);
    this.requestAnimationFrameHandler = 0;
  }
}
