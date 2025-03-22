import { Live2dViewer } from "live2dmanager";

export class Live2dSceneRenderer {
  private requestAnimationFrameHandler: number;
  constructor() {
    this.requestAnimationFrameHandler = 0;
  }

  public render(
    live2dViewer: Live2dViewer,
    scene: (live2dViewer: Live2dViewer) => void,
  ): void {
    const fps = 1000 / 60;
    let lastTime = performance.now();
    const loop = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      if (deltaTime <= fps) {
        this.requestAnimationFrameHandler = requestAnimationFrame((t: number) =>
          loop(t),
        );
        return;
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

      scene(live2dViewer);
      // requestAnimationFrameはunsigned long型な0以外の値なrequest idを返す． ref: https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame#return_value
      this.requestAnimationFrameHandler = requestAnimationFrame(loop);
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
