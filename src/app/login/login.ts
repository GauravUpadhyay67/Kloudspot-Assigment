import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  showPassword = false;
  username = '';
  password = '';
  errorMessage = '';
  isLoading = false;

  constructor(private router: Router, private authService: AuthService, private spinner: NgxSpinnerService) { }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  onLogin() {
    if (!this.username || !this.password) {
      this.errorMessage = 'Please enter username and password';
      return;
    }

    this.isLoading = true;
    this.spinner.show();
    this.authService.login(this.username, this.password).subscribe({
      next: () => {
        // isLoading remains true during navigation to prevent double clicks
        // Spinner remains shown until Dashboard hides it (continuous loading experience)
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading = false;
        this.spinner.hide();
        console.error('Login failed', err);
        this.errorMessage = 'Invalid credentials or API error';
      }
    });
  }
}
