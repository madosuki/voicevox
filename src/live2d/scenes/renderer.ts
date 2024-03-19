import { Live2dViewer } from "live2dmanager";

export class Live2dSceneRenderer {
  private requestAnimationFrameHandler: number;
  constructor() {
    this.requestAnimationFrameHandler = 0;
  }

  public render(
    live2dViewer: Live2dViewer,
    scene: (live2dViewer: Live2dViewer) => void
  ): void {
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

      scene(live2dViewer);
      this.requestAnimationFrameHandler = requestAnimationFrame(loop);
    };

    if (this.requestAnimationFrameHandler !== 0) {
      window.backend.logError("still alive requestAnimationFrame handle");
      return;
    }

    loop();
  }

  public cancelRender(): void {
    if (this.requestAnimationFrameHandler === 0) return;
    cancelAnimationFrame(this.requestAnimationFrameHandler);
    this.requestAnimationFrameHandler = 0;
  }
}
