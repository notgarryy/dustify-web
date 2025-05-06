import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { firebaseConfig } from "./secrets.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

document.getElementById('loginForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const loginBtn = document.getElementById('loginBtn');
  const loader = document.getElementById('loader');
  const btnText = loginBtn.querySelector('.btn-text');

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  btnText.style.opacity = 0;
  loader.style.display = 'block';
  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      loader.style.display = 'none';
      btnText.style.opacity = 1;
      window.location.href = "./dashboard.html"
    })
    .catch((error) => {
      loader.style.display = 'none';
      btnText.style.opacity = 1;
      const errorCode = error.code;
      const errorMessage = error.message;
      alert(errorMessage);
    });
});