/* =========================================================
   KODIAK PROJECT TRACKER
   ========================================================= */

let currentUser = null;
let projects = [];


/* =========================================================
   API
   ========================================================= */

async function api(action, data = {}) {

  try {

    const response = await fetch(API_URL, {

      method: "POST",

      body: JSON.stringify({
        action: action,
        ...data
      })

    });

    const result = await response.json();

    return result;

  } catch (error) {

    console.error("API ERROR:", error);

    return {
      success: false,
      message: "Unable to connect to KODIAK."
    };

  }

}


/* =========================================================
   STARTUP
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

  const savedUser = localStorage.getItem("kodiak_user");

  if (savedUser) {

    try {

      currentUser = JSON.parse(savedUser);

      showApp();

    } catch {

      localStorage.removeItem("kodiak_user");

    }

  }

});


/* =========================================================
   LOGIN
   ========================================================= */

async function login() {

  const username =
    document.getElementById("loginUsername").value.trim();

  const password =
    document.getElementById("loginPassword").value;

  const message =
    document.getElementById("loginMessage");


  if (!username || !password) {

    message.textContent =
      "Enter username and password.";

    return;

  }


  message.textContent = "Logging in...";


  const result = await api("login", {

    username: username,
    password: password

  });


  if (!result.success) {

    message.textContent =
      result.message || "Invalid username or password.";

    return;

  }


  currentUser = result.user || result.data;

  localStorage.setItem(
    "kodiak_user",
    JSON.stringify(currentUser)
  );


  showApp();

}


/* =========================================================
   REGISTER
   ========================================================= */

async function register() {

  const username =
    document.getElementById("registerUsername")
      .value.trim();

  const displayName =
    document.getElementById("registerDisplayName")
      .value.trim();

  const password =
    document.getElementById("registerPassword")
      .value;


  const message =
    document.getElementById("registerMessage");


  if (!username || !displayName || !password) {

    message.textContent =
      "Fill all fields.";

    return;

  }


  message.textContent =
    "Creating account...";


  const result = await api("createUser", {

    username: username,
    displayName: displayName,
    password: password

  });


  if (!result.success) {

    message.textContent =
      result.message || "Unable to create account.";

    return;

  }


  message.style.color = "#4ade80";

  message.textContent =
    "Account created. You can now login.";


  setTimeout(() => {

    showLogin();

    document.getElementById("loginUsername")
      .value = username;

  }, 800);

}


/* =========================================================
   SHOW / HIDE SCREENS
   ========================================================= */

function showLogin() {

  document
    .getElementById("loginScreen")
    .classList.remove("hidden");

  document
    .getElementById("registerScreen")
    .classList.add("hidden");

  document
    .getElementById("appScreen")
    .classList.add("hidden");

}


function showRegister() {

  document
    .getElementById("loginScreen")
    .classList.add("hidden");

  document
    .getElementById("registerScreen")
    .classList.remove("hidden");

}


function showApp() {

  document
    .getElementById("loginScreen")
    .classList.add("hidden");

  document
    .getElementById("registerScreen")
    .classList.add("hidden");

  document
    .getElementById("appScreen")
    .classList.remove("hidden");


  document
    .getElementById("welcomeUser")
    .textContent =
      currentUser.display_name ||
      currentUser.displayName ||
      currentUser.username ||
      "";


  loadProjects();

}


/* =========================================================
   LOGOUT
   ========================================================= */

function logout() {

  currentUser = null;

  projects = [];

  localStorage.removeItem("kodiak_user");

  showLogin();

}


/* =========================================================
   PROJECTS
   ========================================================= */

async function loadProjects() {

  const container =
    document.getElementById("projectsList");

  container.innerHTML =
    `<div class="empty-state">Loading projects...</div>`;


  const userId =
    currentUser.id ||
    currentUser.user_id;


  const result =
    await api("getProjects", {

      user_id: userId

    });


  if (!result.success) {

    container.innerHTML =
      `<div class="empty-state">
        ${escapeHtml(result.message || "Unable to load projects.")}
       </div>`;

    return;

  }


  projects =
    result.projects ||
    result.data ||
    [];


  renderProjects();

}


/* =========================================================
   RENDER PROJECTS
   ========================================================= */

function renderProjects() {

  const container =
    document.getElementById("projectsList");

  const search =
    document
      .getElementById("searchBox")
      .value
      .toLowerCase()
      .trim();


  let filtered =
    projects.filter(project => {

      const name =
        String(project.name || "")
          .toLowerCase();

      return name.includes(search);

    });


  if (!filtered.length) {

    container.innerHTML =
      `<div class="empty-state">
        ${search
          ? "No projects found."
          : "No projects yet. Create your first project."}
       </div>`;

    return;

  }


  container.innerHTML =
    filtered.map(project => {

      const progress =
        Number(project.progress || 0);


      return `

        <div
          class="project-card"
          onclick="openProject('${escapeAttribute(project.id)}')"
        >

          <div
            class="project-color"
            style="background:${escapeAttribute(
              project.color || "#8b5cf6"
            )}"
          ></div>

          <h3>
            ${escapeHtml(project.name || "Untitled")}
          </h3>

          <p>
            ${escapeHtml(
              project.description || "No description"
            )}
          </p>

          <div class="progress">

            <div
              class="progress-bar"
              style="width:${Math.max(
                0,
                Math.min(100, progress)
              )}%"
            ></div>

          </div>

          <div class="progress-info">

            <span>Progress</span>

            <span>${progress}%</span>

          </div>

        </div>

      `;

    }).join("");

}


/* =========================================================
   CREATE PROJECT
   ========================================================= */

async function createProject() {

  const name =
    document.getElementById("projectName")
      .value.trim();

  const description =
    document.getElementById("projectDescription")
      .value.trim();

  const color =
    document.getElementById("projectColor")
      .value;


  if (!name) {

    alert("Enter a project name.");

    return;

  }


  const userId =
    currentUser.id ||
    currentUser.user_id;


  const result =
    await api("createProject", {

      user_id: userId,

      name: name,

      description: description,

      color: color

    });


  if (!result.success) {

    alert(
      result.message ||
      "Unable to create project."
    );

    return;

  }


  closeProjectModal();


  document.getElementById("projectName")
    .value = "";

  document.getElementById("projectDescription")
    .value = "";


  await loadProjects();

}


/* =========================================================
   PROJECT MODAL
   ========================================================= */

function openProjectModal() {

  document
    .getElementById("projectModal")
    .classList.remove("hidden");

}


function closeProjectModal() {

  document
    .getElementById("projectModal")
    .classList.add("hidden");

}


/* =========================================================
   PROJECT OPEN
   ========================================================= */

function openProject(id) {

  const project =
    projects.find(p => String(p.id) === String(id));


  if (!project) return;


  alert(
    "Project opened:\n\n" +
    project.name +
    "\n\nTask hierarchy comes next."
  );

}


/* =========================================================
   SECURITY / DISPLAY HELPERS
   ========================================================= */

function escapeHtml(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


function escapeAttribute(value) {

  return String(value ?? "")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}
