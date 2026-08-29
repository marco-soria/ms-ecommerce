import { Component, inject, model } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly router = inject(Router);

  readonly email = model('');
  readonly password = model('');

  onSubmit(event: Event): void {
    event.preventDefault();
    console.log({
      email: this.email(),
      password: this.password(),
    });
    void this.router.navigate(['/catalog']);
  }
}
