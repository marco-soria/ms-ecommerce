import { Component, model, output } from '@angular/core';

@Component({
  selector: 'app-login',
  imports: [],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  readonly email = model('');
  readonly password = model('');
  readonly navigateToRegister = output<void>();
  readonly navigateToShop = output<void>();

  onSubmit(event: Event): void {
    event.preventDefault();
    console.log({
      email: this.email(),
      password: this.password(),
    });
  }
}
