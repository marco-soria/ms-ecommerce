import { Component, computed, model, output } from '@angular/core';

@Component({
  selector: 'app-register',
  imports: [],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  readonly name = model('');
  readonly email = model('');
  readonly password = model('');
  readonly confirmPassword = model('');
  readonly navigateToLogin = output<void>();
  readonly navigateToShop = output<void>();

  readonly passwordsMatch = computed(
    () => this.password() === this.confirmPassword(),
  );

  readonly showPasswordError = computed(
    () =>
      this.confirmPassword().length > 0 && !this.passwordsMatch(),
  );

  onSubmit(event: Event): void {
    event.preventDefault();

    if (!this.passwordsMatch()) {
      return;
    }

    console.log({
      name: this.name(),
      email: this.email(),
      password: this.password(),
      confirmPassword: this.confirmPassword(),
    });
  }
}
