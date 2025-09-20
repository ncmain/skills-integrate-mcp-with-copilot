document.addEventListener("DOMContentLoaded", () => {
  // Referencias a elementos
  const loginForm = document.getElementById("login-form");
  const loginMessage = document.getElementById("login-message");
  const activitiesContainer = document.getElementById("activities-container");
  const signupContainer = document.getElementById("signup-container");
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  let auth = null; // Guardar credenciales y rol

  // Login
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    // Probar autenticación llamando /activities con auth básica
    try {
      const response = await fetch("/activities", {
        headers: {
          Authorization: "Basic " + btoa(username + ":" + password),
        },
      });
      if (response.ok) {
        // Obtener rol desde backend (no expuesto, así que lo simulamos)
        // En producción, el backend debería devolver el rol
        let role = "estudiante";
        if (username.startsWith("admin")) role = "admin";
        else if (username.startsWith("inst")) role = "institucion";
        else if (username.startsWith("parent")) role = "padre";
        auth = { username, password, role };
        loginMessage.textContent = "Login exitoso como " + role;
        loginMessage.className = "success";
        loginMessage.classList.remove("hidden");
        // Mostrar secciones
        activitiesContainer.classList.remove("hidden");
        signupContainer.classList.remove("hidden");
        document.getElementById("login-container").classList.add("hidden");
        // Cargar actividades
        fetchActivities();
      } else {
        loginMessage.textContent = "Credenciales inválidas";
        loginMessage.className = "error";
        loginMessage.classList.remove("hidden");
      }
    } catch (error) {
      loginMessage.textContent = "Error de conexión";
      loginMessage.className = "error";
      loginMessage.classList.remove("hidden");
    }
  });

  // Obtener actividades con autenticación
  async function fetchActivities() {
    try {
      const response = await fetch("/activities", {
        headers: auth
          ? { Authorization: "Basic " + btoa(auth.username + ":" + auth.password) }
          : {},
      });
      const activities = await response.json();
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";
        const spotsLeft = details.max_participants - details.participants.length;
        // Participantes
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
                <h5>Participants:</h5>
                <ul class="participants-list">
                  ${details.participants
                    .map(
                      (email) =>
                        `<li><span class="participant-email">${email}</span>${
                          auth && (auth.role === "admin" || auth.role === "institucion")
                            ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>`
                            : ""
                        }</li>`
                    )
                    .join("")}
                </ul>
              </div>`
            : `<p><em>No participants yet</em></p>`;
        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;
        activitiesList.appendChild(activityCard);
        // Opciones para registro solo si admin/institución
        if (auth && (auth.role === "admin" || auth.role === "institucion")) {
          const option = document.createElement("option");
          option.value = name;
          option.textContent = name;
          activitySelect.appendChild(option);
        }
      });
      // Botones de desregistro solo para admin/institución
      if (auth && (auth.role === "admin" || auth.role === "institucion")) {
        document.querySelectorAll(".delete-btn").forEach((button) => {
          button.addEventListener("click", handleUnregister);
        });
      }
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Desregistro
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");
    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: auth
            ? { Authorization: "Basic " + btoa(auth.username + ":" + auth.password) }
            : {},
        }
      );
      const result = await response.json();
      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }
      messageDiv.classList.remove("hidden");
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Registro
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;
    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: auth
            ? { Authorization: "Basic " + btoa(auth.username + ":" + auth.password) }
            : {},
        }
      );
      const result = await response.json();
      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }
      messageDiv.classList.remove("hidden");
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Solo mostrar formulario de registro si admin/institución
  function updateSignupVisibility() {
    if (auth && (auth.role === "admin" || auth.role === "institucion")) {
      signupContainer.classList.remove("hidden");
    } else {
      signupContainer.classList.add("hidden");
    }
  }

  // Inicializar solo login visible
  activitiesContainer.classList.add("hidden");
  signupContainer.classList.add("hidden");
  document.getElementById("login-container").classList.remove("hidden");
});
