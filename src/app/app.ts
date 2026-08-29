import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SiteHeader } from '@core/layout/site-header/site-header';

@Component({
  selector: 'app-root',
  imports: [SiteHeader, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
