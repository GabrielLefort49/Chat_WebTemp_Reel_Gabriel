import { Controller, Get, Sse } from '@nestjs/common';
import { AppService } from './app.service';
import { interval, map } from 'rxjs';

@Controller()
export class AppController {
  private lastValue = 0;

  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /*
   * Polling simple
   */
  @Get('time')
  getTime() {
    return { now: new Date().toISOString() };
  }

  /*
   * Long-polling : la requête attend jusqu'à un changement de valeur
   */
  @Get('update')
  async longPoll() {
    return new Promise((resolve) => {
      const initial = this.lastValue;

      const intervalId = setInterval(() => {
        if (this.lastValue !== initial) {
          clearInterval(intervalId);
          resolve({ update: this.lastValue });
        }
      }, 100);
    });
  }

  /*
   * Permet de déclencher un changement
   */
  @Get('increment')
  inc() {
    this.lastValue++;
    return { value: this.lastValue };
  }

  /*
   * SSE (Server-Sent Events)
   */
  @Sse('events')
  sendEvents() {
    return interval(1000).pipe(
      map(() => ({
        data: new Date().toISOString(),
      })),
    );
  }
}
