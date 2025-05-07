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

var hour = document.getElementById("hour");
var minute = document.getElementById("minute");
var seconds = document.getElementById("seconds");

function clock(){
    var date_now = new Date();
    var hr = date_now.getHours();
    var min = date_now.getMinutes();
    var sec = date_now.getSeconds();
    var calc_hr = (hr * 30) + (min / 2);
    var calc_min = (min * 6) + (sec / 10);
    var calc_sec = sec*6;
    hour.style.transform = 'rotate(' + calc_hr + "deg)";
    minute.style.transform = 'rotate(' + calc_min + 'deg)';
    seconds.style.transform = 'rotate(' + calc_sec + 'deg)';
};

function getPMLabel(value, isPM25 = true) {
    const pm25Levels = [
        { max: 15.5, label: "Very Good" },
        { max: 55.4, label: "Good" },
        { max: 150.4, label: "Fair" },
        { max: 250.4, label: "Poor" },
        { max: 350.4, label: "Very Poor" },
        { max: 500, label: "Hazardous" }
    ];

    const pm10Levels = [
        { max: 50, label: "Very Good" },
        { max: 150, label: "Good" },
        { max: 350, label: "Fair" },
        { max: 420, label: "Poor" },
        { max: 500, label: "Hazardous" }
    ];

    const levels = isPM25 ? pm25Levels : pm10Levels;

    for (const level of levels) {
        if (value <= level.max) return level.label;
    }

    return "Unknown";
}

async function updateLivePM(user) {
    try {
        const liveDocRef = doc(db, "users", user.uid, "pm_data", "!liveData");
        const liveDoc = await getDoc(liveDocRef);
        if (liveDoc.exists()) {
            const livePM25 = liveDoc.data().pm25;
            const livePM10 = liveDoc.data().pm10;
            console.log("Updated Live PM2.5:", livePM25);
            console.log("Updated Live PM10:", livePM10);

            const pm25Label = getPMLabel(livePM25, true);
            const pm10Label = getPMLabel(livePM10, false);

            document.getElementById("livePM25").textContent = `${livePM25} µg/m³`;
            document.getElementById("livePM10").textContent = `${livePM10} µg/m³`;

            document.getElementById("level-info-25").textContent = pm25Label;
            document.getElementById("level-info-10").textContent = pm10Label;

            if (window.gaugePM25 && window.gaugePM10) {
                window.gaugePM25.refresh(livePM25);
                window.gaugePM10.refresh(livePM10);
            }
        }
    } catch (err) {
        console.error("Failed to fetch live data:", err);
    }
}

function updateTime() {
    const now = new Date();
    const day = now.toLocaleString(undefined, {
        weekday: 'long',
    });
    const date = now.toLocaleString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    const time = now.toLocaleString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
    document.getElementById("live-day").textContent = day;
    document.getElementById("live-date").textContent = date;
    document.getElementById("live-time").textContent = time;
}

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
            const labels = [];

            const querySnapshot = await getDocs(collection(db, "users", user.uid, "pm_data"));
            querySnapshot.forEach((doc) => {
                const timestamp = doc.data()['timestamp'];
                const today = new Date().toISOString().split('T')[0];
                const docDate = timestamp.toDate().toISOString().split('T')[0];

                if (docDate == today && doc.id != "!liveData") {
                    const PM25 = doc.data()['pm25'];
                    const PM10 = doc.data()['pm10'];
                    todayPM25List.push(PM25);
                    todayPM10List.push(PM10);
                    labels.push(doc.data()['timestamp'].toDate().toTimeString().split(' ')[0]);
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

            window.gaugePM25 = new JustGage({
                id: "gauge25",
                value: livePM25,
                min: 0,
                max: 500,
                title: "PM2.5",
                label: "µg/m³",
                pointer: true,              
                pointerOptions: {
                    toplength: -15,
                    bottomlength: 10,
                    bottomwidth: 12,
                    color: '#8e8e93',
                    stroke: '#ffffff',
                    stroke_width: 3,
                    stroke_linecap: 'round'
                },
                donut: true,
                valueFontColor: "white",
                gaugeWidthScale: 0.6,
                relativeGaugeSize: true,
                customSectors: [
                    { color: "85ff18", lo: 0, hi: 15.5 },
                    { color: "#29ff18", lo: 15.5, hi: 55.4 },
                    { color: "#f8ff18", lo: 55.4, hi: 150.4 },
                    { color: "#ffaa14", lo: 150.4, hi: 250.4 },
                    { color: "#ff0000", lo: 250.4, hi: 500 }
                ],
                counter: true,
                hideInnerShadow: true
            });

            window.gaugePM10 = new JustGage({
                id: "gauge10",
                value: livePM10,
                min: 0,
                max: 500,
                title: "PM10",
                color: "white",
                label: "µg/m³",
                pointer: true,
                pointerOptions: {
                    toplength: -15,
                    bottomlength: 10,
                    bottomwidth: 12,
                    color: '#8e8e93',
                    stroke: '#ffffff',
                    stroke_width: 3,
                    stroke_linecap: 'round'
                },
                donut: true,
                valueFontColor: "white",
                gaugeWidthScale: 0.6,
                relativeGaugeSize: true,
                customSectors: [
                    { color: "#85ff18", lo: 0, hi: 50 },
                    { color: "#29ff18", lo: 50, hi: 150 },
                    { color: "#f8ff18", lo: 150, hi: 350 },
                    { color: "#ffaa14", lo: 350, hi: 420 },
                    { color: "#ff0000", lo: 420, hi: 500 }
                ],
                counter: true,
                hideInnerShadow: true
            });

            updateLivePM(user);
            updateTime();

            setInterval(() => updateTime(), 1000);
            setInterval(() => clock(), 1000);
            setInterval(() => updateLivePM(user), 5000);

        } catch (error) {
            console.error("Error fetching user data:", error);
        }
    } else {
        window.location.href = "../pages/login_page.html";
    }
});
