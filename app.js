// ============================================
// KODIAK APP
// ============================================

let currentUser = null;
let projects = [];
let currentProject = null;


// ============================================
// STARTUP
// ============================================

document.addEventListener("DOMContentLoaded", async () => {
    const { data } = await supabaseClient.auth.getSession();

    if (data.session) {
        currentUser = data.session.user;
        await loadApp();
    } else {
        showLogin();
    }

    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        if (session) {
            currentUser = session.user;
            await loadApp();
        } else {
            currentUser = null;
            showLogin();
        }
    });
});


// ============================================
// AUTH
// ============================================

// We keep the UI as username + password.
// Supabase Auth uses an internal email-shaped identifier
// behind the scenes. The user never needs an email.

function makeInternalEmail(username) {
    return username.trim().toLowerCase() + "@kodiak.local";
}


async function signup() {

    const username =
        document.getElementById("username").value.trim();

    const password =
        document.getElementById("password").value;

    const message =
        document.getElementById("authMessage");

    if (!username || !password) {
        message.textContent = "Enter a username and password.";
        return;
    }

    if (username.length < 3) {
        message.textContent = "Username must be at least 3 characters.";
        return;
    }

    if (password.length < 6) {
        message.textContent = "Password must be at least 6 characters.";
        return;
    }

    message.textContent = "Creating account...";

    const email = makeInternalEmail(username);

    const { data, error } =
        await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    username: username
                }
            }
        });

    if (error) {
        message.textContent = error.message;
        return;
    }

    if (!data.user) {
        message.textContent = "Account creation failed.";
        return;
    }

    // Create profile
    const { error: profileError } =
        await supabaseClient
            .from("profiles")
            .insert({
                id: data.user.id,
                username: username,
                display_name: username
            });

    if (profileError) {
        console.error(profileError);
    }

    message.textContent = "Account created. Logging in...";
}


async function login() {

    const username =
        document.getElementById("username").value.trim();

    const password =
        document.getElementById("password").value;

    const message =
        document.getElementById("authMessage");

    if (!username || !password) {
        message.textContent = "Enter your username and password.";
        return;
    }

    message.textContent = "Logging in...";

    const email = makeInternalEmail(username);

    const { data, error } =
        await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

    if (error) {
        message.textContent = "Invalid username or password.";
        console.error(error);
        return;
    }

    currentUser = data.user;

    await loadApp();
}


async function logout() {

    await supabaseClient.auth.signOut();

    currentUser = null;

    showLogin();
}


function showLogin() {

    document
        .getElementById("loginScreen")
        .classList.remove("hidden");

    document
        .getElementById("appScreen")
        .classList.add("hidden");
}


async function loadApp() {

    document
        .getElementById("loginScreen")
        .classList.add("hidden");

    document
        .getElementById("appScreen")
        .classList.remove("hidden");

    const profile =
        await getProfile();

    document.getElementById("welcomeUser").textContent =
        profile?.display_name ||
        profile?.username ||
        "User";

    await loadTools();
    await loadProjects();
}


// ============================================
// PROFILE
// ============================================

async function getProfile() {

    if (!currentUser) return null;

    const { data, error } =
        await supabaseClient
            .from("profiles")
            .select("*")
            .eq("id", currentUser.id)
            .maybeSingle();

    if (error) {
        console.error(error);
        return null;
    }

    return data;
}


// ============================================
// TOOLS
// ============================================

let allTools = [];


async function loadTools() {

    const { data, error } =
        await supabaseClient
            .from("tools")
            .select("*")
            .order("name");

    if (error) {
        console.error(error);
        return;
    }

    allTools = data || [];

    renderTools(allTools);
}


function renderTools(tools) {

    const grid =
        document.getElementById("toolsGrid");

    grid.innerHTML = "";

    if (!tools.length) {
        grid.innerHTML =
            "<p>No tools available.</p>";
        return;
    }

    tools.forEach(tool => {

        const card =
            document.createElement("div");

        card.className = "tool-card";

        card.innerHTML = `
            <div class="tool-icon">
                ${escapeHTML(tool.icon || "🧰")}
            </div>

            <h3>${escapeHTML(tool.name)}</h3>

            <p>
                ${escapeHTML(tool.description || "")}
            </p>
        `;

        if (tool.route === "project-tracker") {
            card.onclick = () => {
                document
                    .getElementById("projectsGrid")
                    .scrollIntoView({
                        behavior: "smooth"
                    });
            };
        }

        grid.appendChild(card);
    });
}


function filterTools() {

    const search =
        document
            .getElementById("toolSearch")
            .value
            .toLowerCase()
            .trim();

    const filtered =
        allTools.filter(tool =>
            tool.name.toLowerCase().includes(search) ||
            (tool.description || "")
                .toLowerCase()
                .includes(search)
        );

    renderTools(filtered);
}


// ============================================
// PROJECTS
// ============================================

async function loadProjects() {

    if (!currentUser) return;

    const { data, error } =
        await supabaseClient
            .from("projects")
            .select("*")
            .eq("user_id", currentUser.id)
            .eq("archived", false)
            .order("created_at", {
                ascending: false
            });

    if (error) {
        console.error(error);
        return;
    }

    projects = data || [];

    await renderProjects();

    document.getElementById("projectCount").textContent =
        projects.length;
}


async function renderProjects() {

    const grid =
        document.getElementById("projectsGrid");

    grid.innerHTML = "";

    if (!projects.length) {

        grid.innerHTML = `
            <div class="empty-state">
                <p>No projects yet.</p>
                <p>Create your first project above.</p>
            </div>
        `;

        return;
    }

    for (const project of projects) {

        const tasks =
            await getProjectTasks(project.id);

        const progress =
            calculateProjectProgress(tasks);

        const card =
            document.createElement("div");

        card.className = "project-card";

        card.style.setProperty(
            "--project-colour",
            project.colour || "#6366f1"
        );

        card.innerHTML = `
            <h3>${escapeHTML(project.name)}</h3>

            <p>
                ${escapeHTML(project.description || "")}
            </p>

            <div class="project-progress">

                <div class="progress-track">
                    <div
                        class="progress-fill"
                        style="
                            width:${progress}%;
                            --project-colour:${project.colour || "#6366f1"};
                        "
                    ></div>
                </div>

                <div class="progress-info">
                    <span>Progress</span>
                    <span>${progress}%</span>
                </div>

            </div>
        `;

        card.onclick = () =>
            openProject(project);

        grid.appendChild(card);
    }

    await updateDashboardCounts();
}


// ============================================
// PROJECT CREATION
// ============================================

function showNewProject() {

    document
        .getElementById("projectModal")
        .classList.remove("hidden");

    document
        .getElementById("newProjectName")
        .focus();
}


function closeProjectModal() {

    document
        .getElementById("projectModal")
        .classList.add("hidden");

    document.getElementById("newProjectName").value = "";
    document.getElementById("newProjectDescription").value = "";
    document.getElementById("projectMessage").textContent = "";
}


async function createProject() {

    const name =
        document
            .getElementById("newProjectName")
            .value
            .trim();

    const description =
        document
            .getElementById("newProjectDescription")
            .value
            .trim();

    const colour =
        document
            .getElementById("newProjectColour")
            .value;

    const message =
        document.getElementById("projectMessage");

    if (!name) {
        message.textContent =
            "Give the project a name.";
        return;
    }

    message.textContent =
        "Creating project...";

    const { data, error } =
        await supabaseClient
            .from("projects")
            .insert({
                user_id: currentUser.id,
                name: name,
                description: description,
                colour: colour
            })
            .select()
            .single();

    if (error) {

        console.error(error);

        message.textContent =
            error.message;

        return;
    }

    projects.unshift(data);

    closeProjectModal();

    await renderProjects();
}


// ============================================
// PROJECT DETAIL
// ============================================

async function openProject(project) {

    currentProject = project;

    document
        .getElementById("homeView")
        .classList.add("hidden");

    document
        .getElementById("projectView")
        .classList.remove("hidden");

    await renderProjectDetail();
}


async function renderProjectDetail() {

    if (!currentProject) return;

    const container =
        document.getElementById("projectDetails");

    const tasks =
        await getProjectTasks(currentProject.id);

    const progress =
        calculateProjectProgress(tasks);

    container.innerHTML = `

        <div
            class="project-detail-header"
            style="
                --project-colour:
                ${currentProject.colour || "#6366f1"};
            "
        >

            <h1>
                ${escapeHTML(currentProject.name)}
            </h1>

            <p>
                ${escapeHTML(
                    currentProject.description || ""
                )}
            </p>

            <div class="project-progress">

                <div class="progress-track">
                    <div
                        class="progress-fill"
                        style="width:${progress}%"
                    ></div>
                </div>

                <div class="progress-info">
                    <span>Overall progress</span>
                    <span>${progress}%</span>
                </div>

            </div>

        </div>

        <div class="tasks-container">

            <div class="section-header">

                <div>
                    <h2>Tasks</h2>
                    <p>
                        Build your project hierarchy.
                    </p>
                </div>

                <button
                    onclick="addTaskPrompt()"
                    style="
                        width:auto;
                        padding:10px 15px;
                    "
                >
                    + Task
                </button>

            </div>

            <div id="taskList"></div>

        </div>
    `;

    renderTaskTree(tasks);
}


async function getProjectTasks(projectId) {

    const { data, error } =
        await supabaseClient
            .from("tasks")
            .select("*")
            .eq("project_id", projectId)
            .eq("user_id", currentUser.id)
            .order("sort_order", {
                ascending: true
            })
            .order("created_at", {
                ascending: true
            });

    if (error) {
        console.error(error);
        return [];
    }

    return data || [];
}


// ============================================
// TASKS
// ============================================

async function addTaskPrompt(parentId = null) {

    if (!currentProject) return;

    const name =
        prompt(
            parentId
                ? "Subtask name:"
                : "Task name:"
        );

    if (!name || !name.trim()) return;

    const { error } =
        await supabaseClient
            .from("tasks")
            .insert({
                user_id: currentUser.id,
                project_id: currentProject.id,
                parent_task_id: parentId,
                name: name.trim(),
                status: "Yet to begin",
                progress: 0
            });

    if (error) {
        alert(error.message);
        return;
    }

    await renderProjectDetail();
}


function renderTaskTree(tasks) {

    const list =
        document.getElementById("taskList");

    if (!list) return;

    list.innerHTML = "";

    const roots =
        tasks.filter(task =>
            !task.parent_task_id
        );

    if (!roots.length) {

        list.innerHTML = `
            <div class="task-row">
                <div class="task-name">
                    No tasks yet.
                </div>
            </div>
        `;

        return;
    }

    roots.forEach(task => {

        renderTaskNode(
            task,
            tasks,
            list,
            0
        );

    });
}


function renderTaskNode(
    task,
    allTasks,
    container,
    depth
) {

    const children =
        allTasks.filter(child =>
            child.parent_task_id === task.id
        );

    const calculatedProgress =
        children.length
            ? calculateNodeProgress(
                task.id,
                allTasks
            )
            : Number(task.progress || 0);

    const row =
        document.createElement("div");

    row.className = "task-row";

    row.style.marginLeft =
        `${depth * 20}px`;

    row.innerHTML = `

        <div class="task-name">
            ${escapeHTML(task.name)}
        </div>

        <div class="task-meta">

            ${escapeHTML(task.status)}
            ·
            ${calculatedProgress}%

            ${
                task.remarks
                    ? " · " + escapeHTML(task.remarks)
                    : ""
            }

        </div>

        <div style="
            display:flex;
            gap:8px;
            margin-top:10px;
            flex-wrap:wrap;
        ">

            <button
                onclick="addTaskPrompt('${task.id}')"
                style="
                    border:1px solid #333;
                    background:transparent;
                    color:white;
                    padding:6px 9px;
                    border-radius:7px;
                "
            >
                + Subtask
            </button>

            <button
                onclick="editTask('${task.id}')"
                style="
                    border:1px solid #333;
                    background:transparent;
                    color:white;
                    padding:6px 9px;
                    border-radius:7px;
                "
            >
                Edit
            </button>

            <button
                onclick="deleteTask('${task.id}')"
                style="
                    border:1px solid #333;
                    background:transparent;
                    color:#ff6464;
                    padding:6px 9px;
                    border-radius:7px;
                "
            >
                Delete
            </button>

        </div>
    `;

    container.appendChild(row);

    children.forEach(child => {

        renderTaskNode(
            child,
            allTasks,
            container,
            depth + 1
        );

    });
}


async function editTask(taskId) {

    const { data: task, error } =
        await supabaseClient
            .from("tasks")
            .select("*")
            .eq("id", taskId)
            .eq("user_id", currentUser.id)
            .single();

    if (error) {
        alert(error.message);
        return;
    }

    const name =
        prompt("Task name:", task.name);

    if (name === null) return;

    const status =
        prompt(
            "Status:\n\n" +
            "Completed\n" +
            "In progress\n" +
            "Yet to begin\n" +
            "Backlog\n" +
            "Issues\n" +
            "Blocked\n" +
            "Review\n" +
            "In final stage",
            task.status
        );

    if (status === null) return;

    const progress =
        prompt(
            "Progress (0-100):",
            task.progress
        );

    if (progress === null) return;

    const remarks =
        prompt(
            "Remarks:",
            task.remarks || ""
        );

    if (remarks === null) return;

    let numericProgress =
        Number(progress);

    if (
        Number.isNaN(numericProgress) ||
        numericProgress < 0 ||
        numericProgress > 100
    ) {
        alert("Progress must be between 0 and 100.");
        return;
    }

    if (status === "Completed") {
        numericProgress = 100;
    }

    const { error: updateError } =
        await supabaseClient
            .from("tasks")
            .update({
                name: name.trim(),
                status: status,
                progress: numericProgress,
                remarks: remarks,
                updated_at: new Date().toISOString()
            })
            .eq("id", taskId)
            .eq("user_id", currentUser.id);

    if (updateError) {
        alert(updateError.message);
        return;
    }

    await renderProjectDetail();
}


async function deleteTask(taskId) {

    if (
        !confirm(
            "Delete this task and all its subtasks?"
        )
    ) {
        return;
    }

    const { error } =
        await supabaseClient
            .from("tasks")
            .delete()
            .eq("id", taskId)
            .eq("user_id", currentUser.id);

    if (error) {
        alert(error.message);
        return;
    }

    await renderProjectDetail();
}


// ============================================
// PROGRESS
// ============================================

function calculateProjectProgress(tasks) {

    if (!tasks.length) return 0;

    const roots =
        tasks.filter(task =>
            !task.parent_task_id
        );

    if (!roots.length) return 0;

    const values =
        roots.map(root =>
            calculateNodeProgress(
                root.id,
                tasks
            )
        );

    return round(
        values.reduce((a, b) => a + b, 0)
        / values.length
    );
}


function calculateNodeProgress(
    taskId,
    tasks
) {

    const children =
        tasks.filter(task =>
            task.parent_task_id === taskId
        );

    if (!children.length) {

        const task =
            tasks.find(t => t.id === taskId);

        return Number(
            task?.progress || 0
        );
    }

    const values =
        children.map(child =>
            calculateNodeProgress(
                child.id,
                tasks
            )
        );

    return round(
        values.reduce((a, b) => a + b, 0)
        / values.length
    );
}


function round(number) {

    return Math.round(
        number * 100
    ) / 100;
}


// ============================================
// DASHBOARD COUNTS
// ============================================

async function updateDashboardCounts() {

    if (!currentUser) return;

    const { data, error } =
        await supabaseClient
            .from("tasks")
            .select("status")
            .eq("user_id", currentUser.id);

    if (error) {
        console.error(error);
        return;
    }

    const tasks = data || [];

    document.getElementById("progressCount").textContent =
        tasks.filter(t =>
            t.status === "In progress"
        ).length;

    document.getElementById("issueCount").textContent =
        tasks.filter(t =>
            t.status === "Issues" ||
            t.status === "Blocked"
        ).length;

    const { count } =
        await supabaseClient
            .from("reminders")
            .select("*", {
                count: "exact",
                head: true
            })
            .eq("user_id", currentUser.id)
            .eq("completed", false);

    document.getElementById("reminderCount").textContent =
        count || 0;
}


// ============================================
// NAVIGATION
// ============================================

function showHome() {

    currentProject = null;

    document
        .getElementById("projectView")
        .classList.add("hidden");

    document
        .getElementById("homeView")
        .classList.remove("hidden");

    loadProjects();
}


// ============================================
// SAFETY
// ============================================

function escapeHTML(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
          }
