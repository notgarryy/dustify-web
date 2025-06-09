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

function clock() {
    var date_now = new Date();
    var hr = date_now.getHours();
    var min = date_now.getMinutes();
    var sec = date_now.getSeconds();
    var calc_hr = (hr * 30) + (min / 2);
    var calc_min = (min * 6) + (sec / 10);
    var calc_sec = sec * 6;
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

let previousPM25 = null;
let previousPM10 = null;

async function updateLivePM(user) {
    try {
        const liveDocRef = doc(db, "users", user.uid, "pm_data", "!liveData");
        const liveDoc = await getDoc(liveDocRef);
        if (liveDoc.exists()) {
            const livePM25 = liveDoc.data().PM25;
            const livePM10 = liveDoc.data().PM10;

            if (livePM25 === previousPM25 && livePM10 === previousPM10) {
                return; // Skip update
            }

            previousPM25 = livePM25;
            previousPM10 = livePM10;

            const now = new Date().toLocaleTimeString();

            console.log("Updated Live PM2.5:", livePM25);
            console.log("Updated Live PM10:", livePM10);

            if (window.pm25Chart) {
                const maxPoints = 30;

                window.pm25Chart.data.labels.push(now);
                window.pm25Chart.data.datasets[0].data.push(livePM25);
                window.pm25Chart.data.datasets[1].data.push(livePM10);

                if (window.pm25Chart.data.labels.length > maxPoints) {
                    window.pm25Chart.data.labels.shift();
                    window.pm25Chart.data.datasets[0].data.shift();
                    window.pm25Chart.data.datasets[1].data.shift();
                }

                window.pm25Chart.update();
            }

            const pm25Label = getPMLabel(livePM25, true);
            const pm10Label = getPMLabel(livePM10, false);

            document.getElementById("livePM25").textContent = `${livePM25} µg/m³`;
            document.getElementById("livePM10").textContent = `${livePM10} µg/m³`;

            let liveAQI = getAQI(livePM25, livePM10);

            console.log(liveAQI);

            document.getElementById("level-info-25").textContent = pm25Label;
            document.getElementById("level-info-10").textContent = pm10Label;

            if (window.gaugePM25 && window.gaugePM10 && window.aqiGauge) {
                window.gaugePM25.refresh(livePM25);
                window.gaugePM10.refresh(livePM10);
                window.aqiGauge.refresh(liveAQI);
            }
        }

        const connectionDocRef = doc(db, "users", user.uid, "pm_data", "!connection");
        const connectionDoc = await getDoc(connectionDocRef);
        if (connectionDoc.exists()) {
            const connectionData = connectionDoc.data().connected;
            const lastSeen = connectionDoc.data().timestamp.toDate().toLocaleString();
            document.getElementById("connection-status").textContent = connectionData ? "Connected" : "Disconnected";
            document.getElementById("last-updated").textContent = lastSeen;
        }

    } catch (err) {
        console.error("Failed to fetch live data:", err);
    }
}

async function updateConnection(user) {
    try {
        const connectionDocRef = doc(db, "users", user.uid, "pm_data", "!connection");
        getDoc(connectionDocRef).then((connectionDoc) => {
            if (connectionDoc.exists()) {
                const connectionData = connectionDoc.data().connected;
                const lastSeen = connectionDoc.data().timestamp.toDate().toLocaleString();

                document.getElementById("connection-status").textContent = connectionData ? "Connected" : "Disconnected";
                document.getElementById("last-updated").textContent = "Last Connected:  " + lastSeen;

                const indicator = document.getElementById("status-indicator");
                indicator.style.backgroundColor = connectionData ? "lightgreen" : "red";

                // Show or hide chart overlay
                const overlay = document.getElementById("chartOverlay");
                overlay.style.display = connectionData ? "none" : "flex";
            }
        });
    } catch (err) {
        console.error("Failed to update connection:", err);
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

function calculateAQI(concentration, breakpoints) {
  for (let i = 0; i < breakpoints.length; i++) {
    const bp = breakpoints[i];
    if (concentration >= bp.C_lo && concentration <= bp.C_hi) {
      const { I_lo, I_hi, C_lo, C_hi } = bp;
      const aqi = ((I_hi - I_lo) / (C_hi - C_lo)) * (concentration - C_lo) + I_lo;
      return Math.round(aqi);
    }
  }
  return -1; // out of range
}

const pm25Breakpoints = [
  { C_lo: 0.0, C_hi: 12.0, I_lo: 0, I_hi: 50 },
  { C_lo: 12.1, C_hi: 35.4, I_lo: 51, I_hi: 100 },
  { C_lo: 35.5, C_hi: 55.4, I_lo: 101, I_hi: 150 },
  { C_lo: 55.5, C_hi: 150.4, I_lo: 151, I_hi: 200 },
  { C_lo: 150.5, C_hi: 250.4, I_lo: 201, I_hi: 300 },
  { C_lo: 250.5, C_hi: 500.4, I_lo: 301, I_hi: 500 }
];

const pm10Breakpoints = [
  { C_lo: 0, C_hi: 54, I_lo: 0, I_hi: 50 },
  { C_lo: 55, C_hi: 154, I_lo: 51, I_hi: 100 },
  { C_lo: 155, C_hi: 254, I_lo: 101, I_hi: 150 },
  { C_lo: 255, C_hi: 354, I_lo: 151, I_hi: 200 },
  { C_lo: 355, C_hi: 424, I_lo: 201, I_hi: 300 },
  { C_lo: 425, C_hi: 604, I_lo: 301, I_hi: 500 }
];

function getAQI(pm25, pm10) {
  const aqiPm25 = calculateAQI(pm25, pm25Breakpoints);
  const aqiPm10 = calculateAQI(pm10, pm10Breakpoints);

  return Math.max(aqiPm25, aqiPm10);
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
                const data = doc.data();
                const timestamp = data['timestamp'];
                const docCreated = data['docCreated'];
                const today = new Date().toISOString().split('T')[0];
                const docDate = timestamp?.toDate().toISOString().split('T')[0];

                if (docDate === today && doc.id !== "!liveData" && doc.id !== "!connection") {
                    const PM25 = data['avgPM25'];
                    const PM10 = data['avgPM10'];
                    todayPM25List.push(PM25);
                    todayPM10List.push(PM10);

                    if (docCreated) {
                        labels.push(docCreated.toDate().toTimeString().split(' ')[0]);
                    } else {
                        labels.push("Unknown Time");
                    }
                }
            });

            console.log('PM2.5 =>', todayPM25List);
            console.log('PM10  =>', todayPM10List);

            document.getElementById("loadingScreen").style.display = "none";

            window.pm25Chart = new Chart('pmChart', {
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
                            text: "Live Data",
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

            let aqiValue = 0;

            window.aqiGauge = new JustGage({
            id: "aqiGauge",
            value: aqiValue,
            min: 0,
            max: 500,
            valueFontColor: "white",
            title: "Air Quality Index",
            label: "AQI",
            levelColors: ["#00e400", "#ffff00", "#ff7e00", "#ff0000", "#8f3f97", "#7e0023"],
            customSectors: [
                { color: "#00e400", lo: 0, hi: 50 },     // Good
                { color: "#ffff00", lo: 51, hi: 100 },   // Moderate
                { color: "#ff7e00", lo: 101, hi: 150 },  // Unhealthy for sensitive
                { color: "#ff0000", lo: 151, hi: 200 },  // Unhealthy
                { color: "#8f3f97", lo: 201, hi: 300 },  // Very Unhealthy
                { color: "#7e0023", lo: 301, hi: 500 },  // Hazardous
            ],
            gaugeWidthScale: 0.6,
            hideInnerShadow: true
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
            updateConnection(user);
            updateTime();

            setInterval(() => updateTime(), 1000);
            setInterval(() => updateConnection(user), 1000);
            setInterval(() => clock(), 1000);
            setInterval(() => updateLivePM(user), 60000);

        } catch (error) {
            console.error("Error fetching user data:", error);
        }
    } else {
        window.location.href = "../pages/login_page.html";
    }
});
