import { Component, computed, inject, model } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-register',
  imports: [RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private readonly router = inject(Router);

  readonly name = model('');
  readonly email = model('');
  readonly password = model('');
  readonly confirmPassword = model('');

  readonly passwordsMatch = computed(
    () => this.password() === this.confirmPassword(),
  );

  readonly showPasswordError = computed(
    () => this.confirmPassword().length > 0 && !this.passwordsMatch(),
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
    void this.router.navigate(['/catalog']);
  }
}
