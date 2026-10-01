import {
  afterNextRender,
  Component,
  ElementRef,
  output,
  viewChild,
} from '@angular/core';
import { environment } from '@environments/environment';

declare const turnstile: {
  render: (
    element: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      'error-callback'?: () => void;
      'expired-callback'?: () => void;
    },
  ) => string;
  reset: (widgetId?: string) => void;
};

@Component({
  selector: 'app-captcha',
  template: `<div #contenedor></div>`,
})
export class CaptchaComponent {
  private readonly contenedor = viewChild.required<ElementRef<HTMLDivElement>>('contenedor');

  readonly tokenGenerado = output<string>();
  readonly error = output<void>();

  constructor() {
    afterNextRender(() => {
      if (typeof turnstile === 'undefined') {
        this.error.emit();
        return;
      }

      turnstile.render(this.contenedor().nativeElement, {
        sitekey: environment.supabase.turnstileSiteKey,
        callback: (token: string) => this.tokenGenerado.emit(token),
        'error-callback': () => {
          this.tokenGenerado.emit('');
          this.error.emit();
        },
        'expired-callback': () => this.tokenGenerado.emit(''),
      });
    });
  }
}
