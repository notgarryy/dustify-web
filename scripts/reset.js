import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { firebaseConfig } from "./secrets.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

document.getElementById('loginForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const loginBtn = document.getElementById('loginBtn');
  const loader = document.getElementById('loader');
  const btnText = loginBtn.querySelector('.btn-text');

  const email = document.getElementById('email').value;

  btnText.style.opacity = 0;
  loader.style.display = 'block';
  sendPasswordResetEmail(auth, email)
    .then((userCredential) => {
      alert("Password Reset Link Sent!");
      loader.style.display = 'none';
      btnText.style.opacity = 1;
      window.location.href = "./login_page.html"
    })
    .catch((error) => {
      loader.style.display = 'none';
      btnText.style.opacity = 1;
      const errorCode = error.code;
      const errorMessage = error.message;
      alert(errorMessage);
    });
});