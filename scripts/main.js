import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, getDocs, collection } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { firebaseConfig } from "./secrets.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const dropdownToggle = document.getElementById("userDropdown");
const dropdownMenu = document.getElementById("dropdownMenu");
const logoutBtn = document.getElementById("logoutBtn");

dropdownToggle.addEventListener("click", () => {
    dropdownMenu.style.display = dropdownMenu.style.display === "block" ? "none" : "block";
});

logoutBtn.addEventListener("click", () => {
    signOut(auth).then(() => {
        window.location.href = "../pages/login_page.html";
    });
});

onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);
            const data = userDoc.data();
            const name = data.name || data.displayName;
            const email = user.email;

            if (userDoc.exists()) {
                dropdownToggle.textContent = `${name} ▼`;
            } else {
                dropdownToggle.textContent = `${email} ▼`;
            }

            const todayPM25List = [];
            const todayPM10List = [];
            const labels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
            const querySnapshot = await getDocs(collection(db, "users", user.uid, "pm_data"));
            querySnapshot.forEach((doc) => {
                const timestamp = doc.data()['timestamp'];
                const today = new Date().toISOString().split('T')[0];
                const docDate = timestamp.toDate().toISOString().split('T')[0];

                if (docDate == today) {
                    const PM25 = doc.data()['pm25'];
                    const PM10 = doc.data()['pm10'];
                    todayPM25List.push(PM25);
                    todayPM10List.push(PM10);
                }
            });
            console.log('PM2.5 =>', todayPM25List);
            console.log('PM10  =>', todayPM10List);

            document.getElementById("loadingScreen").style.display = "none";

            const pm25Chart = new Chart('pmChart', {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'PM2.5',
                            borderColor: 'orange',
                            data: todayPM25List,
                        },
                        {
                            label: 'PM10',
                            borderColor: 'lightblue',
                            data: todayPM10List,
                        },
                    ]
                },
                options: {
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: {
                                color: 'white',
                                usePointStyle: false,
                            }
                        },
                        title: {
                            display: true,
                            text: "Hourly Data",
                            color: 'white',
                            font: {
                                weight: 'bold',
                                size: 20
                            }
                        }
                    },
                    elements: {
                        line: {
                            tension: 0.3,
                            fill: true,
                        }
                    },
                    scales: {
                        x: {
                            ticks: {
                                color: 'white'
                            },
                            grid: {
                                display: false,
                            }
                        },
                        y: {
                            ticks: {
                                color: 'white'
                            },
                            grid: {
                                display: false,
                            }
                        }
                    }
                }
            });

            const g = new JustGage({
                id: "gauge1",
                value: 2,
                min: 0,
                max: 150,
                title: "PM2.5",
                label: "µg/m³",
                pointer: true,              
                gaugeWidthScale: 0.6,
                customSectors: [
                    { color: "#00e400", lo: 0, hi: 50 },      // Good
                    { color: "#ffff00", lo: 51, hi: 100 },    // Moderate
                    { color: "#ff7e00", lo: 101, hi: 150 },   // Unhealthy for sensitive
                    { color: "#ff0000", lo: 151, hi: 200 },   // Unhealthy
                    { color: "#8f3f97", lo: 201, hi: 300 }    // Very Unhealthy
                  ],
                counter: true,               // animated value change
                hideInnerShadow: true
            });

            const h = new JustGage({
                id: "gauge2",
                value: 100,
                min: 0,
                max: 150,
                title: "PM2.5",
                label: "µg/m³",
                pointer: true,              
                gaugeWidthScale: 0.6,
                customSectors: [
                    { color: "#00e400", lo: 0, hi: 50 },      // Good
                    { color: "#ffff00", lo: 51, hi: 100 },    // Moderate
                    { color: "#ff7e00", lo: 101, hi: 150 },   // Unhealthy for sensitive
                    { color: "#ff0000", lo: 151, hi: 200 },   // Unhealthy
                    { color: "#8f3f97", lo: 201, hi: 300 }    // Very Unhealthy
                  ],
                counter: true,               // animated value change
                hideInnerShadow: true,
            });
        } catch (error) {
            console.error("Error fetching user data:", error);
        }
    } else {
        window.location.href = "../pages/login_page.html";
    }
});