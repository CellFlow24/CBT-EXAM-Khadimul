// --- UPDATE YOUR GOOGLE APPS SCRIPT URL HERE
const API_URL = "https://script.google.com/macros/s/AKfycbw4eoXKboWHXRQ64swS-eYRf0UsftTsNOgw0PHlIUmoqx8JgNHZwqa_-8DF3BzdbwAYaQ/exec"; 

const App = {
  currentUser: null,
  currentSubject: "",
  countdown: null,
  examQuestions: [],
  alertCallback: null,

  // --- AUTO LOGIN LOGIC ---
  init: () => {
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('email');
    const pass = urlParams.get('pass');
    
    if (email && pass) {
      document.getElementById('login-id').value = email;
      document.getElementById('login-pass').value = pass;
      App.login();
      window.history.replaceState({}, document.title, window.location.pathname); // Clears URL for security
    }
  },

  showAlert: (title, message, callback) => {
    document.getElementById('custom-alert-title').innerText = title;
    document.getElementById('custom-alert-message').innerHTML = message;
    document.getElementById('custom-alert-modal').style.display = 'flex';
    App.alertCallback = callback || null;
  },

  closeAlert: () => {
    document.getElementById('custom-alert-modal').style.display = 'none';
    if (App.alertCallback) App.alertCallback();
  },

  postData: (action, payload, callback) => {
    document.getElementById('auth-loading').classList.remove('hidden');
    payload.action = action;
    fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) })
      .then(res => res.json())
      .then(data => {
        document.getElementById('auth-loading').classList.add('hidden');
        callback(data);
      }).catch(err => {
        App.showAlert("Network Error", "Check your internet connection.");
        document.getElementById('auth-loading').classList.add('hidden');
      });
  },

  login: () => {
    const data = {
      loginId: document.getElementById('login-id').value,
      password: document.getElementById('login-pass').value
    };
    if(!data.loginId || !data.password) return App.showAlert("Access Denied", "Credentials required.");
    
    App.postData('login', data, (res) => {
      if(res.success) {
        App.currentUser = res;
        App.loadDashboard();
      } else { App.showAlert("Login Failed", res.message); }
    });
  },

  logout: () => {
    // Clear the user's data for security
    App.currentUser = null;
    document.getElementById('login-id').value = '';
    document.getElementById('login-pass').value = '';
    // Instantly redirect them back to the main website
    window.location.href = "https://udanprep.in/";
  },

  loadDashboard: () => {
    document.getElementById('auth-page').classList.add('hidden');
    document.getElementById('exam-page').classList.add('hidden');
    document.getElementById('dashboard-page').classList.remove('hidden');
    document.getElementById('dash-name').innerText = App.currentUser.name;
    
    fetch(`${API_URL}?action=getDashboardData&email=${App.currentUser.email}`)
      .then(res => res.json())
      .then(data => {
        App.currentSubject = data.currentSet;
        if(data.notification) {
          document.getElementById('notification-box').innerText = data.notification;
          document.getElementById('notification-box').classList.remove('hidden');
        }
        if(data.hasNewPaper) {
          document.getElementById('paper-status-box').innerHTML = `${App.currentSubject} is Live`;
          document.getElementById('paper-status-box').style.color = "#facc15";
          document.getElementById('btn-start-exam').classList.remove('hidden');
        } else {
          document.getElementById('paper-status-box').innerHTML = `Exam Completed`;
          document.getElementById('paper-status-box').style.color = "#94a3b8";
          document.getElementById('btn-start-exam').classList.add('hidden');
        }
      });
      
    fetch(`${API_URL}?action=getResults&name=${App.currentUser.email}`)
      .then(res => res.json())
      .then(data => {
        const tbody = document.getElementById('history-table');
        tbody.innerHTML = "";
        data.forEach(row => {
          tbody.innerHTML += `
            <tr>
              <td style="font-size: 0.85rem; color:#cbd5e1;">${row.date}</td>
              <td style="font-size: 0.9rem; font-weight: bold; color: #facc15;">${row.subject}</td>
              <td style="color:#f8fafc; font-weight:bold; font-size: 1.1rem;">${row.score}</td>
              <td style="color:#16a34a;">${row.correct}</td>
              <td style="color:#ef4444;">${row.wrong}</td>
              <td style="color:#94a3b8;">${row.skip}</td>
            </tr>`;
        });
      });
  },

  startExam: () => {
    document.getElementById('dashboard-page').classList.add('hidden');
    document.getElementById('exam-page').classList.remove('hidden');
    document.getElementById('questions-container').innerHTML = "<div class='loader'></div><p style='text-align:center;'>Loading Paper...</p>";
    
    fetch(`${API_URL}?action=getQuestions`)
      .then(res => res.json())
      .then(data => {
        App.examQuestions = data.questions;
        let html = "";
        App.examQuestions.forEach((q, i) => {
          let imgTag = q.imgUrl ? `<img src="${q.imgUrl}" class="q-image">` : '';
          
          // FIX: Changed from 'card' to 'question-card' so only questions are white
          html += `<div class="question-card" style="clear:both;">
            <p style="font-size:1.1rem; margin-bottom: 10px;"><strong>Q${i+1}. ${q.text}</strong></p>
            ${imgTag}
            <label class="option-label"><input type="radio" name="${q.id}" value="A"> ${q.optA}</label>
            <label class="option-label"><input type="radio" name="${q.id}" value="B"> ${q.optB}</label>
            <label class="option-label"><input type="radio" name="${q.id}" value="C"> ${q.optC}</label>
            <label class="option-label"><input type="radio" name="${q.id}" value="D"> ${q.optD}</label>
            <button type="button" class="btn-clear" onclick="document.getElementsByName('${q.id}').forEach(r=>r.checked=false)">Clear Selection</button>
            <div style="clear:both;"></div>
          </div>`;
        });
        document.getElementById('questions-container').innerHTML = html;
        App.startTimer(90 * 60); 
      });
  },
  
  startTimer: (timeLeft) => {
    App.countdown = setInterval(() => {
      let m = Math.floor(timeLeft / 60); let s = timeLeft % 60;
      document.getElementById('time-display').innerText = `${m<10?'0':''}${m}:${s<10?'0':''}${s}`;
      if(timeLeft <= 0) { 
        clearInterval(App.countdown); 
        App.forceSubmit(); 
      }
      timeLeft--;
    }, 1000);
  },

  submitExam: (isAutoSubmit) => {
    if (isAutoSubmit) { App.forceSubmit(); return; }

    const formData = new FormData(document.getElementById('examForm'));
    let missing = [];
    App.examQuestions.forEach((q, index) => { if (!formData.get(q.id)) missing.push(`Q${index + 1}`); });

    if (missing.length > 0) {
      document.getElementById('missing-questions-list').textContent = missing.join(', ');
      document.getElementById('review-modal').style.display = 'flex';
    } else {
      App.showAlert("Confirm Submission", "Are you sure you want to submit your exam?", () => { App.forceSubmit(); });
    }
  },

  forceSubmit: () => {
    document.getElementById('review-modal').style.display = 'none';
    clearInterval(App.countdown);
    
    const formData = new FormData(document.getElementById('examForm'));
    let answers = {};
    formData.forEach((val, key) => answers[key] = val);
    
    const payload = {
      name: App.currentUser.name,
      email: App.currentUser.email,
      setNumber: App.currentSubject,
      answers: answers
    };

    document.getElementById('exam-page').innerHTML = "<div class='card' style='text-align:center;'><h2>Analyzing Results...</h2><div class='loader'></div></div>";
    
    App.postData('submit', payload, (res) => { 
      App.latestPdfData = res.fileData;
      App.latestPdfName = res.fileName;
      
      // FIX: The Result Card is now wrapped in the standard dark '.card' with properly colored text
      document.getElementById('exam-page').innerHTML = `
        <div class="card" style="text-align:center; padding: 40px 20px;">
          <h2 class="highlight-text" style="font-size: 2.2rem; margin-bottom: 5px;">Exam Complete!</h2>
          <h4 style="color:#cbd5e1; margin-bottom: 25px; text-transform: uppercase;">${res.subject}</h4>
          <p style="font-size: 1.3rem; margin-bottom: 20px;">Score: <strong style="color: #facc15; font-size: 1.8rem;">${res.score}</strong> / ${res.maxScore}</p>
          <p style="color:#94a3b8; margin: 25px 0;">Your detailed PDF report has been emailed.</p>
          <button class="btn btn-primary" onclick="App.downloadLatestPdf()">Download PDF Report</button>
          <button class="btn btn-secondary" onclick="App.loadDashboard()">Return to Dashboard</button>
        </div>
      `;
    });
  },
  
  downloadLatestPdf: () => {
    if(!App.latestPdfData) return App.showAlert("Error", "PDF data not found.");
    const link = document.createElement('a');
    link.href = "data:application/pdf;base64," + App.latestPdfData;
    link.download = App.latestPdfName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

window.onload = App.init;
