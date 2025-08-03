document.addEventListener("DOMContentLoaded", () => {
  const sidebarLinks = document.querySelectorAll(".sidebar-nav ul li a")
  const sections = document.querySelectorAll(".dashboard-section")
  const logoutButton = document.getElementById("logout-btn") // Corrected ID

  // Modals and Forms for User Management
  const userModal = document.getElementById("user-form-modal") // Corrected ID
  const addUserBtn = document.getElementById("add-user-btn") // This ID is not in the HTML, assuming it's for opening the add user form
  const closeModalButtons = document.querySelectorAll(".close") // Corrected class
  const userForm = document.getElementById("user-form") // This is the edit form
  const addUserForm = document.getElementById("add-user-form") // New: Add user form
  const userModalTitle = document.getElementById("form-title-user") // Corrected ID
  const userIdInput = document.getElementById("user_id_edit") // Corrected ID
  const contrasenaInput = document.getElementById("user_contrasena") // Corrected ID for add form password
  const currentFotoPreview = document.getElementById("current_user_photo_preview") // Corrected ID for edit modal
  const fotoInput = document.getElementById("user_foto") // Corrected ID for add form photo

  // Edit Profile Modal (assuming these are still needed, though not directly in system dashboard HTML)
  const editProfileModal = document.getElementById("edit-profile-modal")
  const editProfileBtn = document.getElementById("edit-profile-btn")
  const editProfileForm = document.getElementById("edit-profile-form")
  const editCurrentFotoPreview = document.getElementById("edit-current-foto-preview")
  const editFotoInput = document.getElementById("edit-foto")

  // Change Password Modal (assuming these are still needed)
  const changePasswordModal = document.getElementById("change-password-modal")
  const changePasswordBtn = document.getElementById("change-password-btn")
  const changePasswordForm = document.getElementById("change-password-form")

  // Input fields for Add User Form
  const addUserNameInput = document.getElementById("user_nombre")
  const addUserApellidoInput = document.getElementById("user_apellido")
  const addUserDocPrefixInput = document.getElementById("user_documento_prefix")
  const addUserDocNumberInput = document.getElementById("user_documento_number")
  const addUserCorreoInput = document.getElementById("user_correo")
  const addUserContrasenaInput = document.getElementById("user_contrasena")
  const addUserDireccionInput = document.getElementById("direccion")
  const addUserTelefonoInput = document.getElementById("telefono")
  const addUserFotoInput = document.getElementById("user_foto")

  // Input fields for Edit User Modal
  const editUserNameInput = document.getElementById("nombre_user_edit")
  const editUserApellidoInput = document.getElementById("apellido_user_edit")
  const editUserDocPrefixInput = document.getElementById("documento_user_edit_prefix")
  const editUserDocNumberInput = document.getElementById("documento_user_edit_number")
  const editUserCorreoInput = document.getElementById("correo_user_edit")
  const editUserDireccionInput = document.getElementById("direccion_user_edit") // NEW
  const editUserTelefonoInput = document.getElementById("telefono_user_edit") // NEW
  const editUserFotoInput = document.getElementById("foto_user_edit")
  const editUserStatusInput = document.getElementById("status_user_edit") // NEW

  // Function to show a specific section and hide others
  function showSection(sectionId) {
    document.querySelectorAll(".page").forEach((section) => {
      section.classList.remove("active")
    })
    document.getElementById(sectionId).classList.add("active")

    document.querySelectorAll(".sidebar ul li a").forEach((link) => {
      link.classList.remove("active")
      if (link.dataset.page === sectionId) {
        // Changed from data-section to data-page
        link.classList.add("active")
      }
    })
  }

  // Handle sidebar navigation clicks
  document.querySelectorAll(".sidebar ul li a").forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault()
      const pageId = this.dataset.page
      if (pageId) {
        showSection(pageId)
      }
    })
  })

  // Initial load: show add-user section
  showSection("add-user") // Changed to add-user as per HTML structure

  // Load users for manage-users section
  function loadUsers() {
    fetch("/api/admin/users/list")
      .then((response) => response.json())
      .then((users) => {
        const tableBody = document.querySelector("#users-table tbody")
        tableBody.innerHTML = "" // Clear existing rows
        users.forEach((user) => {
          const row = tableBody.insertRow()
          // Assuming user object has id, nombre, apellido, correo, rol, last_active_display, status
          // Adjusting to match the HTML table headers
          row.insertCell().textContent = user.nombre
          row.insertCell().textContent = user.apellido
          row.insertCell().textContent = user.correo
          row.insertCell().textContent = user.rol.charAt(0).toUpperCase() + user.rol.slice(1) // Capitalize role
          const statusOnlineCell = row.insertCell() // For Online/Offline status
          statusOnlineCell.textContent = user.status_online
          statusOnlineCell.classList.add(user.status_online === "Online" ? "status-online" : "status-offline")
          row.insertCell().textContent = user.account_status // NEW: Account Status (Activo/Deshabilitado)
          row.insertCell().textContent = user.last_active_display

          const actionsCell = row.insertCell()
          const editBtn = document.createElement("button")
          editBtn.innerHTML = '<i class="fas fa-edit"></i>'
          editBtn.classList.add("btn", "action-btn") // Use action-btn for consistency
          editBtn.title = "Editar Usuario"
          editBtn.addEventListener("click", () => editUser(user.id))
          actionsCell.appendChild(editBtn)

          // NEW: Conditionally render Disable or Enable button
          if (user.id !== window.userInfo.id) {
            // Cannot disable/enable self
            if (user.account_status === "Activo") {
              const disableBtn = document.createElement("button")
              disableBtn.innerHTML = '<i class="fas fa-user-slash"></i>' // Icon for disable
              disableBtn.classList.add("btn", "action-btn", "delete") // Using 'delete' class for red color
              disableBtn.title = "Deshabilitar Usuario"
              disableBtn.addEventListener("click", () => disableUser(user.id, user.nombre))
              actionsCell.appendChild(disableBtn)
            } else {
              const enableBtn = document.createElement("button")
              enableBtn.innerHTML = '<i class="fas fa-user-check"></i>' // Icon for enable
              enableBtn.classList.add("btn", "action-btn") // Default color
              enableBtn.title = "Habilitar Usuario"
              enableBtn.addEventListener("click", () => enableUser(user.id, user.nombre))
              actionsCell.appendChild(enableBtn)
            }
          }
        })
      })
      .catch((error) => {
        console.error("Error loading users:", error)
        displayFlashMessage("Error al cargar la lista de usuarios.", "error")
      })
  }

  // Logout functionality
  if (logoutButton) {
    logoutButton.addEventListener("click", (e) => {
      e.preventDefault()
      fetch("/api/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            window.location.href = "/" // Redirect to login page
          } else {
            displayFlashMessage("Error al cerrar sesión: " + data.message, "error")
          }
        })
        .catch((error) => {
          console.error("Error:", error)
          displayFlashMessage("Error de red al cerrar sesión.", "error")
        })
    })
  }

  // --- Flash Message Display ---
  function displayFlashMessage(message, type) {
    const flashMessagesDiv = document.getElementById("flash-messages")
    if (!flashMessagesDiv) return

    // Clear all existing messages before adding a new one
    flashMessagesDiv.innerHTML = "" // ADD THIS LINE

    const alertDiv = document.createElement("div")
    alertDiv.classList.add("alert", `alert-${type}`, "fade-in")
    alertDiv.innerHTML = `
          <div class="alert-content">
              <i class="fas ${type === "success" ? "fa-check-circle" : type === "error" ? "fa-times-circle" : type === "warning" ? "fa-exclamation-triangle" : "fa-info-circle"}"></i>
              <span>${message}</span>
          </div>
          <button class="alert-close">&times;</button>
      `
    flashMessagesDiv.appendChild(alertDiv)

    // Close button functionality
    alertDiv.querySelector(".alert-close").addEventListener("click", () => {
      alertDiv.classList.remove("fade-in")
      alertDiv.classList.add("fade-out")
      alertDiv.addEventListener("animationend", () => alertDiv.remove())
    })

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (alertDiv.parentNode) {
        alertDiv.classList.remove("fade-in")
        alertDiv.classList.add("fade-out")
        alertDiv.addEventListener("animationend", () => alertDiv.remove())
      }
    }, 5000)
  }

  // Clear existing flash messages on page load (if any from Flask)
  const existingFlashMessages = document.querySelectorAll("#flash-messages .alert")
  existingFlashMessages.forEach((msg) => msg.remove())

  // --- Client-side Validation Functions ---
  function validateName(input, messageDiv) {
    const value = input.value.trim()
    if (!value || value.length < 2) {
      messageDiv.textContent = "Debe tener al menos 2 caracteres."
      messageDiv.classList.add("error")
      input.classList.add("field-invalid")
      input.classList.remove("field-valid")
      return false
    }
    if (value.length > 100) {
      messageDiv.textContent = "No puede exceder 100 caracteres."
      messageDiv.classList.add("error")
      input.classList.add("field-invalid")
      input.classList.remove("field-valid")
      return false
    }
    const namePattern = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s'\-.]+$/
    if (!namePattern.test(value)) {
      messageDiv.textContent = "Solo letras, espacios, acentos y caracteres básicos."
      messageDiv.classList.add("error")
      input.classList.add("field-invalid")
      input.classList.remove("field-valid")
      return false
    }
    messageDiv.textContent = ""
    messageDiv.classList.remove("error")
    input.classList.add("field-valid")
    input.classList.remove("field-invalid")
    return true
  }

  function validateDocument(prefixInput, numberInput, messageDiv) {
    const prefix = prefixInput.value
    const number = numberInput.value.trim()
    const fullDocument = `${prefix}-${number}`

    if (!number) {
      messageDiv.textContent = "El número de documento no puede estar vacío."
      messageDiv.classList.add("error")
      numberInput.classList.add("field-invalid")
      numberInput.classList.remove("field-valid")
      return false
    }

    const cedulaPattern = /^[VJ]-\d{7,8}$/i // Matches V- or J- followed by 7 or 8 digits
    if (!cedulaPattern.test(fullDocument)) {
      messageDiv.textContent = "Formato de documento inválido. Debe ser V-XXXXXXXX o V-XXXXXXX."
      messageDiv.classList.add("error")
      numberInput.classList.add("field-invalid")
      numberInput.classList.remove("field-valid")
      return false
    }

    // Basic check for 'V' prefix as requested
    if (prefix.toUpperCase() !== "V") {
      messageDiv.textContent = "Solo se permite el prefijo 'V' para este documento."
      messageDiv.classList.add("error")
      prefixInput.classList.add("field-invalid")
      numberInput.classList.add("field-invalid")
      return false
    }

    messageDiv.textContent = ""
    messageDiv.classList.remove("error")
    numberInput.classList.add("field-valid")
    numberInput.classList.remove("field-invalid")
    return true
  }

  function validateEmail(input, messageDiv) {
    const value = input.value.trim()
    if (!value) {
      messageDiv.textContent = "El email no puede estar vacío."
      messageDiv.classList.add("error")
      input.classList.add("field-invalid")
      input.classList.remove("field-valid")
      return false
    }
    if (value.length > 254) {
      messageDiv.textContent = "El email es demasiado largo."
      messageDiv.classList.add("error")
      input.classList.add("field-invalid")
      input.classList.remove("field-valid")
      return false
    }
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!emailPattern.test(value)) {
      messageDiv.textContent = "Formato de email inválido."
      messageDiv.classList.add("error")
      input.classList.add("field-invalid")
      input.classList.remove("field-valid")
      return false
    }
    messageDiv.textContent = ""
    messageDiv.classList.remove("error")
    input.classList.add("field-valid")
    input.classList.remove("field-invalid")
    return true
  }

  function validatePassword(input, messageDiv) {
    const value = input.value
    if (input.required && !value) {
      messageDiv.textContent = "La contraseña no puede estar vacía."
      messageDiv.classList.add("error")
      input.classList.add("field-invalid")
      input.classList.remove("field-valid")
      return false
    }
    if (input.required && value.length < 8) {
      messageDiv.textContent = "La contraseña debe tener al menos 8 caracteres."
      messageDiv.classList.add("error")
      input.classList.add("field-invalid")
      input.classList.remove("field-valid")
      return false
    }
    messageDiv.textContent = ""
    messageDiv.classList.remove("error")
    input.classList.add("field-valid")
    input.classList.remove("field-invalid")
    return true
  }

  function validateAddress(input, messageDiv) {
    const value = input.value.trim()
    if (!value || value.length < 5) {
      messageDiv.textContent = "La dirección debe tener al menos 5 caracteres."
      messageDiv.classList.add("error")
      input.classList.add("field-invalid")
      input.classList.remove("field-valid")
      return false
    }
    if (value.length > 255) {
      messageDiv.textContent = "La dirección no puede exceder 255 caracteres."
      messageDiv.classList.add("error")
      input.classList.add("field-invalid")
      input.classList.remove("field-valid")
      return false
    }
    const addressPattern = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s,.\-#]+$/
    if (!addressPattern.test(value)) {
      messageDiv.textContent = "La dirección contiene caracteres inválidos."
      messageDiv.classList.add("error")
      input.classList.add("field-invalid")
      input.classList.remove("field-valid")
      return true
    }
    messageDiv.textContent = ""
    messageDiv.classList.remove("error")
    input.classList.add("field-valid")
    input.classList.remove("field-invalid")
    return true
  }

  function validatePhone(input, messageDiv) {
    const value = input.value.trim()
    if (!value) {
      messageDiv.textContent = "El teléfono no puede estar vacío."
      messageDiv.classList.add("error")
      input.classList.add("field-invalid")
      input.classList.remove("field-valid")
      return false
    }
    const cleanPhone = value.replace(/[^\d]/g, "")
    if (cleanPhone.length === 11) {
      if (!cleanPhone.startsWith("04") && !cleanPhone.startsWith("02")) {
        messageDiv.textContent = "El teléfono debe comenzar con 04 (móvil) o 02 (fijo)."
        messageDiv.classList.add("error")
        input.classList.add("field-invalid")
        input.classList.remove("field-valid")
        return false
      }
    } else if (cleanPhone.length === 10) {
      if (!cleanPhone.startsWith("4") && !cleanPhone.startsWith("2")) {
        messageDiv.textContent = "El teléfono debe comenzar con 4 (móvil) o 2 (fijo)."
        messageDiv.classList.add("error")
        input.classList.add("field-invalid")
        input.classList.remove("field-valid")
        return false
      }
    } else {
      messageDiv.textContent = "El teléfono debe tener 10 u 11 dígitos."
      messageDiv.classList.add("error")
      input.classList.add("field-invalid")
      input.classList.remove("field-valid")
      return false
    }
    messageDiv.textContent = ""
    messageDiv.classList.remove("error")
    input.classList.add("field-valid")
    input.classList.remove("field-invalid")
    return true
  }

  function validateFile(input, messageDiv) {
    if (input.files.length === 0) {
      messageDiv.textContent = "" // File is optional, so no error if empty
      input.classList.remove("field-invalid", "field-valid")
      return true
    }

    const file = input.files[0]
    const allowedExtensions = ["png", "jpg", "jpeg", "gif"]
    const fileExtension = file.name.split(".").pop().toLowerCase()
    const maxSize = 5 * 1024 * 1024 // 5 MB

    if (!allowedExtensions.includes(fileExtension)) {
      messageDiv.textContent = `Tipo de archivo no permitido. Permitidos: ${allowedExtensions.join(", ")}.`
      messageDiv.classList.add("error")
      input.classList.add("field-invalid")
      input.classList.remove("field-valid")
      return false
    }

    if (file.size > maxSize) {
      messageDiv.textContent = `El archivo es demasiado grande. Máximo: ${maxSize / (1024 * 1024)}MB.`
      messageDiv.classList.add("error")
      input.classList.add("field-invalid")
      input.classList.remove("field-valid")
      return false
    }

    messageDiv.textContent = ""
    messageDiv.classList.remove("error")
    input.classList.add("field-valid")
    input.classList.remove("field-invalid")
    return true
  }

  // --- Attach Validation Listeners for Add User Form ---
  if (addUserNameInput) {
    addUserNameInput.addEventListener("input", () =>
      validateName(addUserNameInput, document.getElementById("user_nombre_validation_message")),
    )
  }
  if (addUserApellidoInput) {
    addUserApellidoInput.addEventListener("input", () =>
      validateName(addUserApellidoInput, document.getElementById("user_apellido_validation_message")),
    )
  }
  if (addUserDocPrefixInput && addUserDocNumberInput) {
    const docValidationHandler = () =>
      validateDocument(
        addUserDocPrefixInput,
        addUserDocNumberInput,
        document.getElementById("user_documento_validation_message"),
      )
    addUserDocPrefixInput.addEventListener("change", docValidationHandler)
    addUserDocNumberInput.addEventListener("input", docValidationHandler)
  }
  if (addUserCorreoInput) {
    addUserCorreoInput.addEventListener("input", () =>
      validateEmail(addUserCorreoInput, document.getElementById("user_correo_validation_message")),
    )
  }
  if (addUserContrasenaInput) {
    addUserContrasenaInput.addEventListener("input", () =>
      validatePassword(addUserContrasenaInput, document.getElementById("user_contrasena_validation_message")),
    )
  }
  if (addUserDireccionInput) {
    addUserDireccionInput.addEventListener("input", () =>
      validateAddress(addUserDireccionInput, document.getElementById("direccion_validation_message")),
    )
  }
  if (addUserTelefonoInput) {
    addUserTelefonoInput.addEventListener("input", () =>
      validatePhone(addUserTelefonoInput, document.getElementById("telefono_validation_message")),
    )
  }
  if (addUserFotoInput) {
    addUserFotoInput.addEventListener("change", () =>
      validateFile(addUserFotoInput, document.getElementById("user_foto_validation_message")),
    )
  }

  // --- Handle Add User Form Submission ---
  if (addUserForm) {
    addUserForm.addEventListener("submit", handleAddUserSubmit)
  }

  function handleAddUserSubmit(e) {
    e.preventDefault()
    console.log("DEBUG JS: Form submission initiated, preventing default.") // ADDED LOG

    const submitButton = addUserForm.querySelector('button[type="submit"]') // Get the submit button
    submitButton.disabled = true // Disable button on submission
    submitButton.textContent = "Agregando Usuario..." // Change text to indicate loading

    // Run all client-side validations
    const isNameValid = validateName(addUserNameInput, document.getElementById("user_nombre_validation_message"))
    const isApellidoValid = validateName(
      addUserApellidoInput,
      document.getElementById("user_apellido_validation_message"),
    )
    const isDocumentValid = validateDocument(
      addUserDocPrefixInput,
      addUserDocNumberInput,
      document.getElementById("user_documento_validation_message"),
    )
    const isEmailValid = validateEmail(addUserCorreoInput, document.getElementById("user_correo_validation_message"))
    const isPasswordValid = validatePassword(
      addUserContrasenaInput,
      document.getElementById("user_contrasena_validation_message"),
    )
    const isAddressValid = validateAddress(
      addUserDireccionInput,
      document.getElementById("direccion_validation_message"),
    )
    const isPhoneValid = validatePhone(addUserTelefonoInput, document.getElementById("telefono_validation_message"))
    const isFotoValid = validateFile(addUserFotoInput, document.getElementById("user_foto_validation_message"))

    // Check if all required fields are filled and valid
    const isRolSelected = document.getElementById("user_rol").value !== ""

    if (!isRolSelected) {
      displayFlashMessage("Por favor, seleccione un rol para el usuario.", "error")
      submitButton.disabled = false // Re-enable button
      submitButton.textContent = "Agregar Usuario" // Reset button text
      return
    }

    if (
      !isNameValid ||
      !isApellidoValid ||
      !isDocumentValid ||
      !isEmailValid ||
      !isPasswordValid ||
      !isAddressValid ||
      !isPhoneValid ||
      !isFotoValid ||
      !isRolSelected
    ) {
      console.log("DEBUG JS: Client-side validation failed.") // ADDED LOG
      displayFlashMessage("Por favor, corrija los errores en el formulario.", "error")
      submitButton.disabled = false // Re-enable button
      submitButton.textContent = "Agregar Usuario" // Reset button text
      return
    }

    const formData = new FormData(addUserForm)

    // Add the selected role to formData
    formData.append("rol", document.getElementById("user_rol").value)

    // Add the combined document to formData (backend expects 'cedula')
    formData.append("cedula", `${addUserDocPrefixInput.value}-${addUserDocNumberInput.value.trim()}`)

    // DEBUG: Log FormData content
    console.log("DEBUG JS: FormData content before fetch:") // ADDED LOG
    for (const pair of formData.entries()) {
      console.log(pair[0] + ": " + pair[1])
    }

    fetch(addUserForm.action, {
      method: addUserForm.method,
      body: formData,
    })
      .then((response) => {
        console.log("DEBUG JS: Received raw response from backend:", response) // ADDED LOG
        return response.json()
      })
      .then((data) => {
        console.log("DEBUG JS: Received parsed JSON data from backend:", data) // ADDED LOG
        if (data.success) {
          console.log("DEBUG JS: Backend reported success:", data.message) // ADDED LOG
          displayFlashMessage(data.message, "success")
          addUserForm.reset()
          // Clear validation messages and classes after successful submission
          document.querySelectorAll(".field-validation-message").forEach((div) => {
            div.textContent = ""
            div.classList.remove("error", "success")
          })
          document.querySelectorAll("input, select").forEach((input) => {
            input.classList.remove("field-valid", "field-invalid")
          })
          // Hide photo preview
          const userFotoPreview = document.getElementById("user_foto_preview")
          if (userFotoPreview) {
            userFotoPreview.style.display = "none"
            userFotoPreview.src = ""
          }
          loadUsers() // Reload users table
          showSection("manage-users") // Redirect to manage users after adding
        } else {
          console.log("DEBUG JS: Backend reported error:", data.message) // ADDED LOG
          displayFlashMessage("Error: " + data.message, "error")
        }
      })
      .catch((error) => {
        console.error("DEBUG JS: Error during fetch:", error) // ADDED LOG
        displayFlashMessage("Error de red o del servidor al agregar usuario.", "error")
      })
      .finally(() => {
        submitButton.disabled = false // Re-enable button regardless of success or failure
        submitButton.textContent = "Agregar Usuario" // Reset button text
        console.log("DEBUG JS: Fetch operation finished, button re-enabled.") // ADDED LOG
      })
  }

  // --- User Management (Sistema Dashboard) ---

  // Open Add User Modal (This button is not in the provided HTML, but keeping the logic if it exists elsewhere)
  if (addUserBtn) {
    addUserBtn.addEventListener("click", () => {
      userModalTitle.textContent = "Agregar Nuevo Usuario"
      userForm.reset() // This resets the edit form, not the add form
      userIdInput.value = ""
      contrasenaInput.required = true // Password is required for new users
      currentFotoPreview.style.display = "none"
      currentFotoPreview.src = ""
      userModal.style.display = "block"
    })
  }

  // Close Modals
  closeModalButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (userModal) userModal.style.display = "none"
      if (editProfileModal) editProfileModal.style.display = "none"
      if (changePasswordModal) changePasswordModal.style.display = "none"
    })
  })

  window.addEventListener("click", (event) => {
    if (userModal && event.target == userModal) {
      userModal.style.display = "none"
    }
    if (editProfileModal && event.target == editProfileModal) {
      editProfileModal.style.display = "none"
    }
    if (changePasswordModal && event.target == changePasswordModal) {
      changePasswordModal.style.display = "none"
    }
  })

  // Load users when the manage-users section is activated
  document.querySelector('a[data-page="manage-users"]').addEventListener("click", loadUsers)

  // Edit User Function
  function editUser(userId) {
    fetch(`/api/admin/users/${userId}`)
      .then((response) => response.json())
      .then((user) => {
        if (user.success === false) {
          displayFlashMessage("Error: " + user.message, "error")
          return
        }
        userModalTitle.textContent = "Editar Usuario"
        userIdInput.value = user.id
        editUserNameInput.value = user.nombre
        editUserApellidoInput.value = user.apellido

        // Split cedula into prefix and number for edit form
        const cedulaParts = user.cedula.split("-")
        if (cedulaParts.length === 2) {
          editUserDocPrefixInput.value = cedulaParts[0]
          editUserDocNumberInput.value = cedulaParts[1]
        } else {
          editUserDocPrefixInput.value = "V" // Default
          editUserDocNumberInput.value = user.cedula // Fallback
        }

        editUserCorreoInput.value = user.correo
        editUserDireccionInput.value = user.direccion || "" // NEW: Populate direccion
        editUserTelefonoInput.value = user.telefono || "" // NEW: Populate telefono
        document.getElementById("rol_user_edit").value = user.rol
        editUserStatusInput.value = user.status // NEW: Populate status

        // Display current photo
        if (user.foto) {
          currentFotoPreview.src = user.foto
          currentFotoPreview.style.display = "block"
        } else {
          currentFotoPreview.src = ""
          currentFotoPreview.style.display = "none"
        }

        userModal.style.display = "block"
      })
      .catch((error) => {
        console.error("Error fetching user for edit:", error)
        displayFlashMessage("Error al cargar datos del usuario para edición.", "error")
      })
  }

  // Handle Edit User Form Submission
  if (userForm) {
    userForm.addEventListener("submit", handleEditUserSubmit)
  }

  function handleEditUserSubmit(e) {
    e.preventDefault()

    // Client-side validation for edit form
    const isNameValid = validateName(editUserNameInput, document.getElementById("nombre_user_edit_validation_message"))
    const isApellidoValid = validateName(
      editUserApellidoInput,
      document.getElementById("apellido_user_edit_validation_message"),
    )
    const isDocumentValid = validateDocument(
      editUserDocPrefixInput,
      editUserDocNumberInput,
      document.getElementById("documento_user_edit_validation_message"),
    )
    const isEmailValid = validateEmail(
      editUserCorreoInput,
      document.getElementById("correo_user_edit_validation_message"),
    )
    const isAddressValid = validateAddress(
      editUserDireccionInput,
      document.getElementById("direccion_user_edit_validation_message"),
    ) // NEW
    const isPhoneValid = validatePhone(
      editUserTelefonoInput,
      document.getElementById("telefono_user_edit_validation_message"),
    ) // NEW
    // No password validation on edit unless a password field is explicitly added and required
    const isFotoValid = validateFile(editUserFotoInput, document.getElementById("foto_user_edit_validation_message"))

    if (
      !isNameValid ||
      !isApellidoValid ||
      !isDocumentValid ||
      !isEmailValid ||
      !isAddressValid ||
      !isPhoneValid ||
      !isFotoValid
    ) {
      // NEW: Added address and phone
      displayFlashMessage("Por favor, corrija los errores en el formulario de edición.", "error")
      return
    }

    const formData = new FormData(userForm)
    const userId = userIdInput.value

    // Add the combined document to formData
    formData.append("cedula", `${editUserDocPrefixInput.value}-${editUserDocNumberInput.value.trim()}`)

    fetch(`/api/admin/users/${userId}`, {
      method: "POST", // Backend uses POST for update
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          displayFlashMessage(data.message, "success")
          userModal.style.display = "none"
          loadUsers() // Reload users table
        } else {
          displayFlashMessage("Error: " + data.message, "error")
        }
      })
      .catch((error) => {
        console.error("Error updating user:", error)
        displayFlashMessage("Error de red o del servidor al actualizar usuario.", "error")
      })
  }

  // MODIFIED: Renamed from deleteUser to disableUser
  function disableUser(userId, userName) {
    if (confirm(`¿Está seguro de que desea deshabilitar al usuario ${userName}?`)) {
      fetch(`/api/admin/users/disable/${userId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            displayFlashMessage(data.message, "success")
            loadUsers() // Reload users table
          } else {
            displayFlashMessage("Error: " + data.message, "error")
          }
        })
        .catch((error) => {
          console.error("Error disabling user:", error)
          displayFlashMessage("Error de red o del servidor al deshabilitar usuario.", "error")
        })
    }
  }

  // NEW: Function to enable a user
  function enableUser(userId, userName) {
    if (confirm(`¿Está seguro de que desea habilitar al usuario ${userName}?`)) {
      fetch(`/api/admin/users/enable/${userId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            displayFlashMessage(data.message, "success")
            loadUsers() // Reload users table
          } else {
            displayFlashMessage("Error: " + data.message, "error")
          }
        })
        .catch((error) => {
          console.error("Error enabling user:", error)
          displayFlashMessage("Error de red o del servidor al habilitar usuario.", "error")
        })
    }
  }

  // Handle photo preview for Add User form
  if (fotoInput) {
    fotoInput.addEventListener("change", function () {
      const previewElement = document.getElementById("user_foto_preview") || document.createElement("img")
      if (!document.getElementById("user_foto_preview")) {
        previewElement.id = "user_foto_preview"
        previewElement.style.width = "100px"
        previewElement.style.height = "100px"
        previewElement.style.objectFit = "cover"
        previewElement.style.borderRadius = "50%"
        previewElement.style.marginTop = "5px"
        // Insert it after the file input's parent form-group
        this.closest(".form-group").appendChild(previewElement)
      }

      if (this.files && this.files[0]) {
        const reader = new FileReader()
        reader.onload = (e) => {
          previewElement.src = e.target.result
          previewElement.style.display = "block"
        }
        reader.readAsDataURL(this.files[0])
      } else {
        previewElement.style.display = "none"
        previewElement.src = ""
      }
    })
  }

  // Handle photo preview for Edit User form
  if (editUserFotoInput) {
    editUserFotoInput.addEventListener("change", function () {
      if (this.files && this.files[0]) {
        const reader = new FileReader()
        reader.onload = (e) => {
          currentFotoPreview.src = e.target.result
        }
        reader.readAsDataURL(this.files[0])
      }
    })
  }

  // --- Profile Management (Usuario Logueado) ---
  // (Assuming these are handled by dashboard_admin.js or another script)
  // Open Edit Profile Modal
  if (editProfileBtn) {
    editProfileBtn.addEventListener("click", () => {
      // Pre-fill form with current user data (already in HTML via Jinja)
      // Ensure the photo preview is correct
      const currentPhotoSrc = document.querySelector(".profile-avatar").src
      if (editCurrentFotoPreview) editCurrentFotoPreview.src = currentPhotoSrc
      if (editProfileModal) editProfileModal.style.display = "block"
    })
  }

  // Handle Edit Profile Form Submission
  if (editProfileForm) {
    editProfileForm.addEventListener("submit", (e) => {
      e.preventDefault()

      const formData = new FormData(editProfileForm)
      // The current user's ID is available in the session, no need to pass it from form
      // The backend will use session['user_id']

      fetch("/api/admin/users/" + window.userInfo.id, {
        // Assuming this endpoint updates the logged-in user
        method: "POST",
        body: formData,
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            displayFlashMessage(data.message, "success")
            if (editProfileModal) editProfileModal.style.display = "none"
            // Reload page to reflect changes in header/profile section
            window.location.reload()
          } else {
            displayFlashMessage("Error al actualizar perfil: " + data.message, "error")
          }
        })
        .catch((error) => {
          console.error("Error updating profile:", error)
          displayFlashMessage("Error de red o del servidor al actualizar perfil.", "error")
        })
    })
  }

  // Open Change Password Modal
  if (changePasswordBtn) {
    changePasswordBtn.addEventListener("click", () => {
      if (changePasswordForm) changePasswordForm.reset()
      if (changePasswordModal) changePasswordModal.style.display = "block"
    })
  }

  // Handle Change Password Form Submission
  if (changePasswordForm) {
    changePasswordForm.addEventListener("submit", (e) => {
      e.preventDefault()

      const currentPassword = document.getElementById("current-password").value
      const newPassword = document.getElementById("new-password").value
      const confirmNewPassword = document.getElementById("confirm-new-password").value

      if (newPassword !== confirmNewPassword) {
        displayFlashMessage("La nueva contraseña y la confirmación no coinciden.", "error")
        return
      }

      fetch("/api/change_password", {
        // Assuming a new API endpoint for changing password
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            displayFlashMessage(data.message, "success")
            if (changePasswordModal) changePasswordModal.style.display = "none"
            if (changePasswordForm) changePasswordForm.reset()
          } else {
            displayFlashMessage("Error al cambiar contraseña: " + data.message, "error")
          }
        })
        .catch((error) => {
          console.error("Error changing password:", error)
          displayFlashMessage("Error de red o del servidor al cambiar contraseña.", "error")
        })
    })
  }

  // User Search Functionality
  const searchUserInput = document.getElementById("search-user-input")
  const userSearchButton = document.getElementById("user-search-button")
  const userTable = document.getElementById("users-table") // Corrected ID

  function filterUsers() {
    const searchTerm = searchUserInput.value.toLowerCase()
    const rows = userTable.querySelectorAll("tbody tr")

    rows.forEach((row) => {
      const name = row.cells[0].textContent.toLowerCase() // Nombre
      const apellido = row.cells[1].textContent.toLowerCase() // Apellido
      const email = row.cells[2].textContent.toLowerCase() // Correo
      const role = row.cells[3].textContent.toLowerCase() // Rol
      const accountStatus = row.cells[4].textContent.toLowerCase() // Estado de Cuenta (Activo/Deshabilitado)

      if (
        name.includes(searchTerm) ||
        apellido.includes(searchTerm) ||
        email.includes(searchTerm) ||
        role.includes(searchTerm) ||
        accountStatus.includes(searchTerm)
      ) {
        row.style.display = "" // Show row
      } else {
        row.style.display = "none" // Hide row
      }
    })
  }

  if (searchUserInput) {
    searchUserInput.addEventListener("input", filterUsers) // Changed to 'input' for real-time filtering
  }

  if (userSearchButton) {
    userSearchButton.addEventListener("click", filterUsers)
  }

  if (searchUserInput) {
    searchUserInput.addEventListener("keypress", (event) => {
      if (event.key === "Enter") {
        event.preventDefault() // Prevent form submission
        filterUsers()
      }
    })
  }

  // Set up heartbeat to keep session alive
  setInterval(
    async () => {
      try {
        await fetch("/api/user/heartbeat", { method: "POST" })
      } catch (error) {
        console.error("Heartbeat failed:", error)
      }
    },
    5 * 60 * 1000,
  ) // Every 5 minutes
})
