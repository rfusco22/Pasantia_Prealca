document.addEventListener("DOMContentLoaded", () => {
  // Cargar datos del usuario
  loadUserInfo()

  // Configurar navegación del sidebar
  setupSidebarNavigation()

  // Configurar cierre de sesión
  setupLogout()

  // Cargar datos iniciales para todas las tablas
  loadInitialData()

  // Setup modals
  setupUserModal()
  setupClientModal()
  setupDriverModal()
  setupTruckModal()
  setupSellerModal()
  setupSupplierModal()
  setupSupplierPurchaseOrderModal() // NEW: Setup modal for supplier purchase orders
  setupInventoryModal()
  setupConcreteDesignModal()
  setupMaintenanceModal()
  setupDispatchDetailsModal() // NEW: Setup modal for dispatch details

  startHeartbeat() // Start heartbeat for online status

  // Initial load for dispatch guides table
  if (document.getElementById("registro-guias-despacho").classList.contains("active")) {
    loadRegistroGuiaDespachoTable()
  }
})

// Cargar información del usuario
function loadUserInfo() {
  const userName = document.getElementById("user-name")
  const userPhoto = document.getElementById("user-photo")

  if (window.userInfo && window.userInfo.nombreCompleto) {
    if (userName.textContent === "Cargando...") {
      userName.textContent = window.userInfo.nombreCompleto
    }

    sessionStorage.setItem("userName", window.userInfo.nombreCompleto)
    sessionStorage.setItem("userId", window.userInfo.id)
    sessionStorage.setItem("userRole", window.userInfo.rol)

    if (userPhoto) {
      userPhoto.src = window.userInfo.foto
    }
  } else {
    userName.textContent = sessionStorage.getItem("userName") || "Usuario Gerencia"
  }
}

// Configurar navegación del sidebar
function setupSidebarNavigation() {
  const menuLinks = document.querySelectorAll(".sidebar ul li a:not(#logout-btn)")

  menuLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault()

      menuLinks.forEach((item) => item.classList.remove("active"))
      this.classList.add("active")

      const pageId = this.getAttribute("data-page")
      showPage(pageId)

      // Load specific tables when their pages are active
      if (pageId === "manage-users") {
        loadUsersTable()
      } else if (pageId === "manage-clients") {
        loadClientsTable()
      } else if (pageId === "manage-drivers") {
        loadDriversTable()
      } else if (pageId === "manage-trucks") {
        loadTrucksTable()
      } else if (pageId === "manage-sellers") {
        loadSellersTable()
      } else if (pageId === "manage-suppliers") {
        loadSuppliersTable()
      } else if (pageId === "manage-supplier-purchase-orders") {
        loadSupplierPurchaseOrdersTable()
      } else if (pageId === "manage-inventory") {
        loadInventoryTable()
      } else if (pageId === "manage-concrete-designs") {
        loadConcreteDesignsTable()
      } else if (pageId === "manage-maintenance") {
        loadMaintenanceTable()
      } else if (pageId === "registro-guias-despacho") {
        loadRegistroGuiaDespachoTable()
      }
    })
  })
}

// Mostrar página específica
function showPage(pageId) {
  const pages = document.querySelectorAll(".page")

  pages.forEach((page) => {
    page.classList.remove("active")
  })

  const activePage = document.getElementById(pageId)
  if (activePage) {
    activePage.classList.add("active")
  }
}

// Configurar cierre de sesión
function setupLogout() {
  const logoutBtn = document.getElementById("logout-btn")

  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault()

    fetch("/api/logout", {
      method: "POST",
      credentials: "same-origin",
    })
      .then(() => {
        window.location.href = "/"
      })
      .catch((error) => {
        console.error("Error al cerrar sesión:", error)
        window.location.href = "/"
      })
  })
}

// Cargar datos iniciales para todas las tablas
function loadInitialData() {
  loadUsersTable()
  loadClientsTable()
  loadDriversTable()
  loadTrucksTable()
  loadSellersTable()
  loadSuppliersTable()
  loadSupplierPurchaseOrdersTable()
  loadInventoryTable()
  loadConcreteDesignsTable()
  loadMaintenanceTable()
  loadRegistroGuiaDespachoTable() // NEW: Load dispatch guides table
}

// Load Users Table
function loadUsersTable() {
  const table = document.getElementById("users-table")
  if (!table) return

  const tbody = table.querySelector("tbody")

  fetch("/api/admin/users/list")
    .then((response) => response.json())
    .then((data) => {
      tbody.innerHTML = ""
      data.forEach((user) => {
        const row = document.createElement("tr")
        const statusClass = user.status === "Online" ? "status-online" : "status-offline"
        row.innerHTML = `
          <td>${user.nombre}</td>
          <td>${user.apellido}</td>
          <td>${user.correo}</td>
          <td>${user.rol}</td>
          <td><span class="status-badge ${statusClass}">${user.status}</span></td>
          <td>${user.last_active_display}</td>
          <td>
              <button class="action-btn edit" data-id="${user.id}" title="Editar"><i class="fas fa-edit"></i></button>
              <button class="action-btn delete" data-id="${user.id}" title="Eliminar"><i class="fas fa-trash"></i></button>
          </td>
      `
        tbody.appendChild(row)
      })
      setupUserActions()
    })
    .catch((error) => console.error("Error al cargar usuarios:", error))
}

// Setup User Actions (Edit/Delete)
function setupUserActions() {
  const editButtons = document.querySelectorAll("#users-table .action-btn.edit")
  editButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const userId = this.getAttribute("data-id")
      editUser(userId)
    })
  })

  const deleteButtons = document.querySelectorAll("#users-table .action-btn.delete")
  deleteButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const userId = this.getAttribute("data-id")
      deleteUser(userId)
    })
  })
}

// Edit User
function editUser(userId) {
  fetch(`/api/admin/users/${userId}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`)
      }
      return response.json()
    })
    .then((data) => {
      const user = data
      document.getElementById("user_id_edit").value = user.id
      document.getElementById("nombre_user_edit").value = user.nombre || ""
      document.getElementById("apellido_user_edit").value = user.apellido || ""
      document.getElementById("cedula_user_edit").value = user.cedula || ""
      document.getElementById("correo_user_edit").value = user.correo || ""
      document.getElementById("rol_user_edit").value = user.rol || ""

      const currentPhotoPreview = document.getElementById("current_user_photo_preview")
      const userPhotoInput = document.getElementById("foto_user_edit")

      if (user.foto) {
        currentPhotoPreview.src = user.foto
        currentPhotoPreview.style.display = "block"
      } else {
        currentPhotoPreview.src = "/static/img/user.png"
        currentPhotoPreview.style.display = "block"
      }
      userPhotoInput.value = ""

      document.getElementById("form-title-user").textContent = "Editar Usuario"
      document.getElementById("user-form").action = `/api/admin/users/${user.id}`
      document.getElementById("user-form-modal").style.display = "block"
    })
    .catch((error) => {
      console.error("Error al cargar la información del usuario:", error)
      displayFlashMessage(`Error al cargar la información del usuario: ${error.message}`, "error")
    })
}

// Delete User
function deleteUser(userId) {
  if (confirm("¿Está seguro que desea eliminar este usuario?")) {
    fetch(`/api/admin/users/delete/${userId}`, {
      method: "POST",
    })
      .then(async (response) => {
        const responseText = await response.text()
        let data
        try {
          data = JSON.parse(responseText)
        } catch (e) {
          data = { success: response.ok, message: responseText || `Error HTTP: ${response.status}` }
        }

        if (response.ok) {
          return data
        } else {
          throw new Error(data.message || `Error HTTP: ${response.status}`)
        }
      })
      .then((data) => {
        if (data.success) {
          displayFlashMessage(data.message, "success")
          loadUsersTable()
        } else {
          displayFlashMessage(data.message, "error")
        }
      })
      .catch((error) => {
        console.error("Error:", error)
        displayFlashMessage(`Error al eliminar el usuario: ${error.message}`, "error")
      })
  }
}

// Setup User Modal
function setupUserModal() {
  const userModal = document.getElementById("user-form-modal")
  if (userModal) {
    const closeBtnUser = userModal.querySelector(".close")
    if (closeBtnUser) {
      closeBtnUser.addEventListener("click", () => {
        userModal.style.display = "none"
      })
    }

    const form = document.getElementById("user-form")
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault()

        const formData = new FormData(form)
        const userId = document.getElementById("user_id_edit").value

        fetch(`/api/admin/users/${userId}`, {
          method: "POST",
          body: formData,
        })
          .then(async (response) => {
            const responseText = await response.text()
            let data
            try {
              data = JSON.parse(responseText)
            } catch (e) {
              data = { success: response.ok, message: responseText || `Error HTTP: ${response.status}` }
            }

            if (response.ok) {
              return data
            } else {
              throw new Error(data.message || `Error HTTP: ${response.status}`)
            }
          })
          .then((data) => {
            if (data.success) {
              displayFlashMessage(data.message, "success")
              userModal.style.display = "none"
              loadUsersTable()
            } else {
              displayFlashMessage(data.message, "error")
            }
          })
          .catch((error) => {
            console.error("Error:", error)
            displayFlashMessage(`Error al guardar el usuario: ${error.message}`, "error")
          })
      })
    }

    window.addEventListener("click", (event) => {
      if (userModal && event.target === userModal) {
        userModal.style.display = "none"
      }
    })
  }
}

// Load Clients Table
function loadClientsTable() {
  const table = document.getElementById("clients-table")
  if (!table) return

  const tbody = table.querySelector("tbody")

  fetch("/api/clientes")
    .then((response) => response.json())
    .then((data) => {
      tbody.innerHTML = ""
      data.forEach((client) => {
        const row = document.createElement("tr")
        row.innerHTML = `
          <td>${client.nombre}</td>
          <td>${client.direccion}</td>
          <td>${client.telefono}</td>
          <td>${client.documento}</td>
          <td>${client.vendedor_nombre || "N/A"}</td>
          <td>
              <button class="action-btn edit" data-id="${client.id}" title="Editar"><i class="fas fa-edit"></i></button>
              <button class="action-btn delete" data-id="${client.id}" title="Eliminar"><i class="fas fa-trash"></i></button>
          </td>
      `
        tbody.appendChild(row)
      })
      setupClientActions()
    })
    .catch((error) => console.error("Error al cargar clientes:", error))
}

// Setup Client Actions (Edit/Delete)
function setupClientActions() {
  const addClientBtn = document.getElementById("add-client-btn")
  if (addClientBtn) {
    addClientBtn.addEventListener("click", () => {
      openClientModal("add")
    })
  }

  const editButtons = document.querySelectorAll("#clients-table .action-btn.edit")
  editButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const clientId = this.getAttribute("data-id")
      openClientModal("edit", clientId)
    })
  })

  const deleteButtons = document.querySelectorAll("#clients-table .action-btn.delete")
  deleteButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const clientId = this.getAttribute("data-id")
      deleteClient(clientId)
    })
  })
}

// Open Client Modal (Add/Edit)
function openClientModal(mode, clientId = null) {
  const modal = document.getElementById("client-form-modal")
  const form = document.getElementById("client-form")
  const title = document.getElementById("form-title-client")
  const clientIdEdit = document.getElementById("client_id_edit")
  const nombreInput = document.getElementById("nombre_client_edit")
  const direccionInput = document.getElementById("direccion_client_edit")
  const telefonoInput = document.getElementById("telefono_client_edit")
  const documentoTypeSelect = document.getElementById("documento_type_client_edit")
  const documentoNumberInput = document.getElementById("documento_number_client_edit")
  const vendedorSelect = document.getElementById("vendedor_client_edit")

  form.reset() // Clear form fields

  // Load sellers for the select input
  fetch("/api/vendedores")
    .then((response) => response.json())
    .then((data) => {
      vendedorSelect.innerHTML = '<option value="">Seleccione vendedor</option>'
      data.forEach((vendedor) => {
        const option = document.createElement("option")
        option.value = vendedor.id
        option.textContent = vendedor.nombre
        vendedorSelect.appendChild(option)
      })
    })
    .catch((error) => console.error("Error al cargar vendedores para cliente:", error))

  if (mode === "add") {
    title.textContent = "Agregar Cliente"
    form.action = "/api/clientes"
    clientIdEdit.value = ""
  } else if (mode === "edit" && clientId) {
    title.textContent = "Editar Cliente"
    form.action = `/api/clientes/${clientId}`
    clientIdEdit.value = clientId

    fetch(`/api/clientes/${clientId}`)
      .then((response) => response.json())
      .then((data) => {
        nombreInput.value = data.nombre
        direccionInput.value = data.direccion
        telefonoInput.value = data.telefono
        const [docType, docNumber] = data.documento.split("-")
        documentoTypeSelect.value = docType
        documentoNumberInput.value = docNumber
        vendedorSelect.value = data.vendedor_id
      })
      .catch((error) => console.error("Error al cargar datos del cliente:", error))
  }

  modal.style.display = "block"
}

// Setup Client Modal
function setupClientModal() {
  const modal = document.getElementById("client-form-modal")
  if (modal) {
    const closeBtn = modal.querySelector(".close")
    closeBtn.addEventListener("click", () => {
      modal.style.display = "none"
    })

    const form = document.getElementById("client-form")
    form.addEventListener("submit", (e) => {
      e.preventDefault()

      const formData = new FormData(form)
      const clientId = document.getElementById("client_id_edit").value
      const url = clientId ? `/api/clientes/${clientId}` : "/api/clientes"

      fetch(url, {
        method: "POST",
        body: formData,
      })
        .then(async (response) => {
          const responseText = await response.text()
          let data
          try {
            data = JSON.parse(responseText)
          } catch (e) {
            data = { success: response.ok, message: responseText || `Error HTTP: ${response.status}` }
          }
          if (response.ok) return data
          else throw new Error(data.message || `Error HTTP: ${response.status}`)
        })
        .then((data) => {
          displayFlashMessage(data.message, "success")
          modal.style.display = "none"
          loadClientsTable()
        })
        .catch((error) => {
          console.error("Error:", error)
          displayFlashMessage(`Error al guardar cliente: ${error.message}`, "error")
        })
    })

    window.addEventListener("click", (event) => {
      if (event.target === modal) {
        modal.style.display = "none"
      }
    })
  }
}

// Delete Client
function deleteClient(clientId) {
  if (confirm("¿Está seguro que desea eliminar este cliente?")) {
    fetch(`/api/clientes/delete/${clientId}`, {
      method: "POST",
    })
      .then(async (response) => {
        const responseText = await response.text()
        let data
        try {
          data = JSON.parse(responseText)
        } catch (e) {
          data = { success: response.ok, message: responseText || `Error HTTP: ${response.status}` }
        }
        if (response.ok) return data
        else throw new Error(data.message || `Error HTTP: ${response.status}`)
      })
      .then((data) => {
        displayFlashMessage(data.message, data.success ? "success" : "error")
        loadClientsTable()
      })
      .catch((error) => {
        console.error("Error:", error)
        displayFlashMessage(`Error al eliminar cliente: ${error.message}`, "error")
      })
  }
}

// Load Drivers Table
function loadDriversTable() {
  const table = document.getElementById("drivers-table")
  if (!table) return

  const tbody = table.querySelector("tbody")

  fetch("/api/choferes")
    .then((response) => response.json())
    .then((data) => {
      tbody.innerHTML = ""
      data.forEach((driver) => {
        const row = document.createElement("tr")
        row.innerHTML = `
          <td>${driver.nombre}</td>
          <td>${driver.cedula}</td>
          <td>${driver.licencia}</td>
          <td>${formatDate(driver.vencimiento_licencia)}</td>
          <td>${driver.certificado_medico}</td>
          <td>${formatDate(driver.vencimiento_certificado)}</td>
          <td>
              <button class="action-btn edit" data-id="${driver.id}" title="Editar"><i class="fas fa-edit"></i></button>
              <button class="action-btn delete" data-id="${driver.id}" title="Eliminar"><i class="fas fa-trash"></i></button>
          </td>
      `
        tbody.appendChild(row)
      })
      setupDriverActions()
    })
    .catch((error) => console.error("Error al cargar choferes:", error))
}

// Setup Driver Actions (Add/Edit/Delete)
function setupDriverActions() {
  const addDriverBtn = document.getElementById("add-driver-btn")
  if (addDriverBtn) {
    addDriverBtn.addEventListener("click", () => {
      openDriverModal("add")
    })
  }

  const editButtons = document.querySelectorAll("#drivers-table .action-btn.edit")
  editButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const driverId = this.getAttribute("data-id")
      openDriverModal("edit", driverId)
    })
  })

  const deleteButtons = document.querySelectorAll("#drivers-table .action-btn.delete")
  deleteButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const driverId = this.getAttribute("data-id")
      deleteDriver(driverId)
    })
  })
}

// Open Driver Modal (Add/Edit)
function openDriverModal(mode, driverId = null) {
  const modal = document.getElementById("driver-form-modal")
  const form = document.getElementById("driver-form")
  const title = document.getElementById("form-title-driver")
  const driverIdEdit = document.getElementById("driver_id_edit")
  const nombreInput = document.getElementById("nombre_driver_edit")
  const documentoTypeSelect = document.getElementById("documento_type_driver_edit")
  const documentoNumberInput = document.getElementById("documento_number_driver_edit")
  const licenciaInput = document.getElementById("licencia_driver_edit")
  const vencimientoLicenciaInput = document.getElementById("vencimiento_licencia_driver_edit")
  const certificadoMedicoInput = document.getElementById("certificado_medico_driver_edit")
  const vencimientoCertificadoInput = document.getElementById("vencimiento_certificado_driver_edit")

  form.reset()

  if (mode === "add") {
    title.textContent = "Agregar Chofer"
    form.action = "/api/choferes"
    driverIdEdit.value = ""
  } else if (mode === "edit" && driverId) {
    title.textContent = "Editar Chofer"
    form.action = `/api/choferes/${driverId}`
    driverIdEdit.value = driverId

    fetch(`/api/choferes/${driverId}`)
      .then((response) => response.json())
      .then((data) => {
        nombreInput.value = data.nombre
        const [docType, docNumber] = data.cedula.split("-")
        documentoTypeSelect.value = docType
        documentoNumberInput.value = docNumber
        licenciaInput.value = data.licencia
        vencimientoLicenciaInput.value = data.vencimiento_licencia
        certificadoMedicoInput.value = data.certificado_medico
        vencimientoCertificadoInput.value = data.vencimiento_certificado
      })
      .catch((error) => console.error("Error al cargar datos del chofer:", error))
  }

  modal.style.display = "block"
}

// Setup Driver Modal
function setupDriverModal() {
  const modal = document.getElementById("driver-form-modal")
  if (modal) {
    const closeBtn = modal.querySelector(".close")
    closeBtn.addEventListener("click", () => {
      modal.style.display = "none"
    })

    const form = document.getElementById("driver-form")
    form.addEventListener("submit", (e) => {
      e.preventDefault()

      const formData = new FormData(form)
      const driverId = document.getElementById("driver_id_edit").value
      const url = driverId ? `/api/choferes/${driverId}` : "/api/choferes"

      fetch(url, {
        method: "POST",
        body: formData,
      })
        .then(async (response) => {
          const responseText = await response.text()
          let data
          try {
            data = JSON.parse(responseText)
          } catch (e) {
            data = { success: response.ok, message: responseText || `Error HTTP: ${response.status}` }
          }
          if (response.ok) return data
          else throw new Error(data.message || `Error HTTP: ${response.status}`)
        })
        .then((data) => {
          displayFlashMessage(data.message, "success")
          modal.style.display = "none"
          loadDriversTable()
        })
        .catch((error) => {
          console.error("Error:", error)
          displayFlashMessage(`Error al guardar chofer: ${error.message}`, "error")
        })
    })

    window.addEventListener("click", (event) => {
      if (event.target === modal) {
        modal.style.display = "none"
      }
    })
  }
}

// Delete Driver
function deleteDriver(driverId) {
  if (confirm("¿Está seguro que desea eliminar este chofer?")) {
    fetch(`/api/choferes/delete/${driverId}`, {
      method: "POST",
    })
      .then(async (response) => {
        const responseText = await response.text()
        let data
        try {
          data = JSON.parse(responseText)
        } catch (e) {
          data = { success: response.ok, message: responseText || `Error HTTP: ${response.status}` }
        }
        if (response.ok) return data
        else throw new Error(data.message || `Error HTTP: ${response.status}`)
      })
      .then((data) => {
        displayFlashMessage(data.message, data.success ? "success" : "error")
        loadDriversTable()
      })
      .catch((error) => {
        console.error("Error:", error)
        displayFlashMessage(`Error al eliminar chofer: ${error.message}`, "error")
      })
  }
}

// Load Trucks Table
function loadTrucksTable() {
  const table = document.getElementById("trucks-table")
  if (!table) return

  const tbody = table.querySelector("tbody")

  fetch("/api/camiones")
    .then((response) => response.json())
    .then((data) => {
      tbody.innerHTML = ""
      data.forEach((truck) => {
        const row = document.createElement("tr")
        row.innerHTML = `
          <td>${truck.marca}</td>
          <td>${truck.modelo}</td>
          <td>${truck.placa}</td>
          <td>${truck.capacidad}</td>
          <td>${truck.current_odometer}</td>
          <td>${truck.estado}</td>
          <td>
              <button class="action-btn edit" data-id="${truck.id}" title="Editar"><i class="fas fa-edit"></i></button>
              <button class="action-btn delete" data-id="${truck.id}" title="Eliminar"><i class="fas fa-trash"></i></button>
          </td>
      `
        tbody.appendChild(row)
      })
      setupTruckActions()
    })
    .catch((error) => console.error("Error al cargar camiones:", error))
}

// Setup Truck Actions (Add/Edit/Delete)
function setupTruckActions() {
  const addTruckBtn = document.getElementById("add-truck-btn")
  if (addTruckBtn) {
    addTruckBtn.addEventListener("click", () => {
      openTruckModal("add")
    })
  }

  const editButtons = document.querySelectorAll("#trucks-table .action-btn.edit")
  editButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const truckId = this.getAttribute("data-id")
      openTruckModal("edit", truckId)
    })
  })

  const deleteButtons = document.querySelectorAll("#trucks-table .action-btn.delete")
  deleteButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const truckId = this.getAttribute("data-id")
      deleteTruck(truckId)
    })
  })
}

// Open Truck Modal (Add/Edit)
function openTruckModal(mode, truckId = null) {
  const modal = document.getElementById("truck-form-modal")
  const form = document.getElementById("truck-form")
  const title = document.getElementById("form-title-truck")
  const truckIdEdit = document.getElementById("truck_id_edit")
  const marcaInput = document.getElementById("marca_truck_edit")
  const modeloInput = document.getElementById("modelo_truck_edit")
  const placaInput = document.getElementById("placa_truck_edit")
  const capacidadInput = document.getElementById("capacidad_truck_edit")
  const odometerInput = document.getElementById("odometer_truck_edit")
  const estadoSelect = document.getElementById("estado_truck_edit")

  form.reset()

  if (mode === "add") {
    title.textContent = "Agregar Camión"
    form.action = "/api/camiones"
    truckIdEdit.value = ""
  } else if (mode === "edit" && truckId) {
    title.textContent = "Editar Camión"
    form.action = `/api/camiones/${truckId}`
    truckIdEdit.value = truckId

    fetch(`/api/camiones/${truckId}`)
      .then((response) => response.json())
      .then((data) => {
        marcaInput.value = data.marca
        modeloInput.value = data.modelo
        placaInput.value = data.placa
        capacidadInput.value = data.capacidad
        odometerInput.value = data.current_odometer
        estadoSelect.value = data.estado
      })
      .catch((error) => console.error("Error al cargar datos del camión:", error))
  }

  modal.style.display = "block"
}

// Setup Truck Modal
function setupTruckModal() {
  const modal = document.getElementById("truck-form-modal")
  if (modal) {
    const closeBtn = modal.querySelector(".close")
    closeBtn.addEventListener("click", () => {
      modal.style.display = "none"
    })

    const form = document.getElementById("truck-form")
    form.addEventListener("submit", (e) => {
      e.preventDefault()

      const formData = new FormData(form)
      const truckId = document.getElementById("truck_id_edit").value
      const url = truckId ? `/api/camiones/${truckId}` : "/api/camiones"

      fetch(url, {
        method: "POST",
        body: formData,
      })
        .then(async (response) => {
          const responseText = await response.text()
          let data
          try {
            data = JSON.parse(responseText)
          } catch (e) {
            data = { success: response.ok, message: responseText || `Error HTTP: ${response.status}` }
          }
          if (response.ok) return data
          else throw new Error(data.message || `Error HTTP: ${response.status}`)
        })
        .then((data) => {
          displayFlashMessage(data.message, "success")
          modal.style.display = "none"
          loadTrucksTable()
        })
        .catch((error) => {
          console.error("Error:", error)
          displayFlashMessage(`Error al guardar camión: ${error.message}`, "error")
        })
    })

    window.addEventListener("click", (event) => {
      if (event.target === modal) {
        modal.style.display = "none"
      }
    })
  }
}

// Delete Truck
function deleteTruck(truckId) {
  if (confirm("¿Está seguro que desea eliminar este camión?")) {
    fetch(`/api/camiones/delete/${truckId}`, {
      method: "POST",
    })
      .then(async (response) => {
        const responseText = await response.text()
        let data
        try {
          data = JSON.parse(responseText)
        } catch (e) {
          data = { success: response.ok, message: responseText || `Error HTTP: ${response.status}` }
        }
        if (response.ok) return data
        else throw new Error(data.message || `Error HTTP: ${response.status}`)
      })
      .then((data) => {
        displayFlashMessage(data.message, data.success ? "success" : "error")
        loadTrucksTable()
      })
      .catch((error) => {
        console.error("Error:", error)
        displayFlashMessage(`Error al eliminar camión: ${error.message}`, "error")
      })
  }
}

// Load Sellers Table
function loadSellersTable() {
  const table = document.getElementById("sellers-table")
  if (!table) return

  const tbody = table.querySelector("tbody")

  fetch("/api/vendedores")
    .then((response) => response.json())
    .then((data) => {
      tbody.innerHTML = ""
      data.forEach((seller) => {
        const row = document.createElement("tr")
        row.innerHTML = `
          <td>${seller.nombre}</td>
          <td>${seller.cedula}</td>
          <td>
              <button class="action-btn edit" data-id="${seller.id}" title="Editar"><i class="fas fa-edit"></i></button>
              <button class="action-btn delete" data-id="${seller.id}" title="Eliminar"><i class="fas fa-trash"></i></button>
          </td>
      `
        tbody.appendChild(row)
      })
      setupSellerActions()
    })
    .catch((error) => console.error("Error al cargar vendedores:", error))
}

// Setup Seller Actions (Add/Edit/Delete)
function setupSellerActions() {
  const addSellerBtn = document.getElementById("add-seller-btn")
  if (addSellerBtn) {
    addSellerBtn.addEventListener("click", () => {
      openSellerModal("add")
    })
  }

  const editButtons = document.querySelectorAll("#sellers-table .action-btn.edit")
  editButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const sellerId = this.getAttribute("data-id")
      openSellerModal("edit", sellerId)
    })
  })

  const deleteButtons = document.querySelectorAll("#sellers-table .action-btn.delete")
  deleteButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const sellerId = this.getAttribute("data-id")
      deleteSeller(sellerId)
    })
  })
}

// Open Seller Modal (Add/Edit)
function openSellerModal(mode, sellerId = null) {
  const modal = document.getElementById("seller-form-modal")
  const form = document.getElementById("seller-form")
  const title = document.getElementById("form-title-seller")
  const sellerIdEdit = document.getElementById("seller_id_edit")
  const nombreInput = document.getElementById("nombre_seller_edit")
  const documentoTypeSelect = document.getElementById("documento_type_seller_edit")
  const documentoNumberInput = document.getElementById("documento_number_seller_edit")

  form.reset()

  if (mode === "add") {
    title.textContent = "Agregar Vendedor"
    form.action = "/api/vendedores"
    sellerIdEdit.value = ""
  } else if (mode === "edit" && sellerId) {
    title.textContent = "Editar Vendedor"
    form.action = `/api/vendedores/${sellerId}`
    sellerIdEdit.value = sellerId

    fetch(`/api/vendedores/${sellerId}`)
      .then((response) => response.json())
      .then((data) => {
        nombreInput.value = data.nombre
        const [docType, docNumber] = data.cedula.split("-")
        documentoTypeSelect.value = docType
        documentoNumberInput.value = docNumber
      })
      .catch((error) => console.error("Error al cargar datos del vendedor:", error))
  }

  modal.style.display = "block"
}

// Setup Seller Modal
function setupSellerModal() {
  const modal = document.getElementById("seller-form-modal")
  if (modal) {
    const closeBtn = modal.querySelector(".close")
    closeBtn.addEventListener("click", () => {
      modal.style.display = "none"
    })

    const form = document.getElementById("seller-form")
    form.addEventListener("submit", (e) => {
      e.preventDefault()

      const formData = new FormData(form)
      const sellerId = document.getElementById("seller_id_edit").value
      const url = sellerId ? `/api/vendedores/${sellerId}` : "/api/vendedores"

      fetch(url, {
        method: "POST",
        body: formData,
      })
        .then(async (response) => {
          const responseText = await response.text()
          let data
          try {
            data = JSON.parse(responseText)
          } catch (e) {
            data = { success: response.ok, message: responseText || `Error HTTP: ${response.status}` }
          }
          if (response.ok) return data
          else throw new Error(data.message || `Error HTTP: ${response.status}`)
        })
        .then((data) => {
          displayFlashMessage(data.message, "success")
          modal.style.display = "none"
          loadSellersTable()
        })
        .catch((error) => {
          console.error("Error:", error)
          displayFlashMessage(`Error al guardar vendedor: ${error.message}`, "error")
        })
    })

    window.addEventListener("click", (event) => {
      if (event.target === modal) {
        modal.style.display = "none"
      }
    })
  }
}

// Delete Seller
function deleteSeller(sellerId) {
  if (confirm("¿Está seguro que desea eliminar este vendedor?")) {
    fetch(`/api/vendedores/delete/${sellerId}`, {
      method: "POST",
    })
      .then(async (response) => {
        const responseText = await response.text()
        let data
        try {
          data = JSON.parse(responseText)
        } catch (e) {
          data = { success: response.ok, message: responseText || `Error HTTP: ${response.status}` }
        }
        if (response.ok) return data
        else throw new Error(data.message || `Error HTTP: ${response.status}`)
      })
      .then((data) => {
        displayFlashMessage(data.message, data.success ? "success" : "error")
        loadSellersTable()
      })
      .catch((error) => {
        console.error("Error:", error)
        displayFlashMessage(`Error al eliminar vendedor: ${error.message}`, "error")
      })
  }
}

// Load Suppliers Table
function loadSuppliersTable() {
  const table = document.getElementById("suppliers-table")
  if (!table) return

  const tbody = table.querySelector("tbody")

  fetch("/api/proveedores")
    .then((response) => response.json())
    .then((data) => {
      tbody.innerHTML = ""
      data.forEach((supplier) => {
        const row = document.createElement("tr")
        row.innerHTML = `
          <td>${supplier.nombre}</td>
          <td>${supplier.rif}</td>
          <td>${supplier.direccion || "N/A"}</td>
          <td>${supplier.telefono || "N/A"}</td>
          <td>${supplier.email || "N/A"}</td>
          <td>${supplier.nombre_contacto || "N/A"}</td>
          <td>${supplier.telefono_contacto || "N/A"}</td>
          <td>
              <button class="action-btn edit" data-id="${supplier.id}" title="Editar"><i class="fas fa-edit"></i></button>
              <button class="action-btn delete" data-id="${supplier.id}" title="Eliminar"><i class="fas fa-trash"></i></button>
          </td>
      `
        tbody.appendChild(row)
      })
      setupSupplierActions()
    })
    .catch((error) => console.error("Error al cargar proveedores:", error))
}

// Setup Supplier Actions (Add/Edit/Delete)
function setupSupplierActions() {
  const addSupplierBtn = document.getElementById("add-supplier-btn")
  if (addSupplierBtn) {
    addSupplierBtn.addEventListener("click", () => {
      openSupplierModal("add")
    })
  }

  const editButtons = document.querySelectorAll("#suppliers-table .action-btn.edit")
  editButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const supplierId = this.getAttribute("data-id")
      openSupplierModal("edit", supplierId)
    })
  })

  const deleteButtons = document.querySelectorAll("#suppliers-table .action-btn.delete")
  deleteButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const supplierId = this.getAttribute("data-id")
      deleteSupplier(supplierId)
    })
  })
}

// Open Supplier Modal (Add/Edit)
function openSupplierModal(mode, supplierId = null) {
  const modal = document.getElementById("supplier-form-modal")
  const form = document.getElementById("supplier-form")
  const title = document.getElementById("form-title-supplier")
  const supplierIdEdit = document.getElementById("supplier_id_edit")
  const nombreInput = document.getElementById("nombre_supplier_edit")
  const rifTypeSelect = document.getElementById("rif_type_supplier_edit")
  const rifNumberInput = document.getElementById("rif_number_supplier_edit")
  const direccionInput = document.getElementById("direccion_supplier_edit")
  const telefonoInput = document.getElementById("telefono_supplier_edit")
  const emailInput = document.getElementById("email_supplier_edit")
  const nombreContactoInput = document.getElementById("nombre_contacto_supplier_edit")
  const telefonoContactoInput = document.getElementById("telefono_contacto_supplier_edit")
  const materialsContainer = document.getElementById("supplier_materials_container")

  form.reset()
  materialsContainer.innerHTML = "" // Clear existing materials

  function addMaterialRow(material = {}) {
    const materialRow = document.createElement("div")
    materialRow.classList.add("supplier-material-row")
    materialRow.innerHTML = `
          <input type="text" class="supplier-material-name" placeholder="Nombre Material" value="${material.nombre_material || ""}" style="width: 40%;" required>
          <input type="number" class="supplier-material-price" placeholder="Precio" value="${material.precio || ""}" min="0.01" step="0.01" style="width: 20%;" required>
          <input type="text" class="supplier-material-unit" placeholder="Unidad (ej: kg, m3)" value="${material.unidad_medida || ""}" style="width: 25%;" required>
          <button type="button" class="remove-supplier-material-btn" style="background: none; border: none; color: red; cursor: pointer; font-size: 1.2em;">&times;</button>
      `
    materialsContainer.appendChild(materialRow)
    materialRow.querySelector(".remove-supplier-material-btn").addEventListener("click", () => {
      materialRow.remove()
    })
  }

  document.getElementById("add-supplier-material-btn").onclick = () => addMaterialRow()

  if (mode === "add") {
    title.textContent = "Agregar Proveedor"
    form.action = "/api/proveedores"
    supplierIdEdit.value = ""
    addMaterialRow() // Add one empty material row for new supplier
  } else if (mode === "edit" && supplierId) {
    title.textContent = "Editar Proveedor"
    form.action = `/api/proveedores/${supplierId}`
    supplierIdEdit.value = supplierId

    fetch(`/api/proveedores/${supplierId}`)
      .then((response) => response.json())
      .then((data) => {
        nombreInput.value = data.nombre
        const [rifType, rifNumber] = data.rif.split("-")
        rifTypeSelect.value = rifType
        rifNumberInput.value = rifNumber
        direccionInput.value = data.direccion
        telefonoInput.value = data.telefono
        emailInput.value = data.email
        nombreContactoInput.value = data.nombre_contacto || ""
        telefonoContactoInput.value = data.telefono_contacto || ""

        if (data.materiales && data.materiales.length > 0) {
          data.materiales.forEach((material) => addMaterialRow(material))
        } else {
          addMaterialRow() // Add an empty row if no materials
        }
      })
      .catch((error) => console.error("Error al cargar datos del proveedor:", error))
  }

  modal.style.display = "block"
}

// Setup Supplier Modal
function setupSupplierModal() {
  const modal = document.getElementById("supplier-form-modal")
  if (modal) {
    const closeBtn = modal.querySelector(".close")
    closeBtn.addEventListener("click", () => {
      modal.style.display = "none"
    })

    const form = document.getElementById("supplier-form")
    form.addEventListener("submit", (e) => {
      e.preventDefault()

      const formData = new FormData(form)
      const supplierId = document.getElementById("supplier_id_edit").value
      const url = supplierId ? `/api/proveedores/${supplierId}` : "/api/proveedores"

      const materials = []
      document.querySelectorAll(".supplier-material-row").forEach((row) => {
        const name = row.querySelector(".supplier-material-name").value
        const price = row.querySelector(".supplier-material-price").value
        const unit = row.querySelector(".supplier-material-unit").value
        if (name && price && unit) {
          materials.push({
            nombre_material: name,
            precio: Number.parseFloat(price),
            unidad_medida: unit,
          })
        }
      })
      formData.append("materiales", JSON.stringify(materials))

      fetch(url, {
        method: "POST",
        body: formData,
      })
        .then(async (response) => {
          const responseText = await response.text()
          let data
          try {
            data = JSON.parse(responseText)
          } catch (e) {
            data = { success: response.ok, message: responseText || `Error HTTP: ${response.status}` }
          }
          if (response.ok) return data
          else throw new Error(data.message || `Error HTTP: ${response.status}`)
        })
        .then((data) => {
          displayFlashMessage(data.message, "success")
          modal.style.display = "none"
          loadSuppliersTable()
        })
        .catch((error) => {
          console.error("Error:", error)
          displayFlashMessage(`Error al guardar proveedor: ${error.message}`, "error")
        })
    })

    window.addEventListener("click", (event) => {
      if (event.target === modal) {
        modal.style.display = "none"
      }
    })
  }
}

// Delete Supplier
function deleteSupplier(supplierId) {
  if (confirm("¿Está seguro que desea eliminar este proveedor?")) {
    fetch(`/api/proveedores/delete/${supplierId}`, {
      method: "POST",
    })
      .then(async (response) => {
        const responseText = await response.text()
        let data
        try {
          data = JSON.parse(responseText)
        } catch (e) {
          data = { success: response.ok, message: responseText || `Error HTTP: ${response.status}` }
        }
        if (response.ok) return data
        else throw new Error(data.message || `Error HTTP: ${response.status}`)
      })
      .then((data) => {
        displayFlashMessage(data.message, data.success ? "success" : "error")
        loadSuppliersTable()
      })
      .catch((error) => {
        console.error("Error:", error)
        displayFlashMessage(`Error al eliminar proveedor: ${error.message}`, "error")
      })
  }
}

// Load Supplier Purchase Orders Table
function loadSupplierPurchaseOrdersTable() {
  const table = document.getElementById("supplier-purchase-orders-table")
  if (!table) return

  const tbody = table.querySelector("tbody")

  fetch("/api/ordenes_compra_proveedor/list")
    .then((response) => response.json())
    .then((data) => {
      tbody.innerHTML = ""
      data.forEach((order) => {
        const row = document.createElement("tr")
        let actionsHtml = ""
        if (order.status === "pending") {
          actionsHtml = `
            <button class="action-btn approve-po" data-id="${order.id}" title="Aprobar"><i class="fas fa-check"></i></button>
            <button class="action-btn deny-po" data-id="${order.id}" title="Denegar"><i class="fas fa-times"></i></button>
            <button class="action-btn view-po" data-id="${order.id}" title="Ver"><i class="fas fa-eye"></i></button>
            <button class="action-btn delete-po" data-id="${order.id}" title="Eliminar"><i class="fas fa-trash"></i></button>
          `
        } else if (order.status === "approved") {
          actionsHtml = `
            <button class="action-btn view-po" data-id="${order.id}" title="Ver"><i class="fas fa-eye"></i></button>
            <button class="action-btn print-po" data-id="${order.id}" title="Imprimir"><i class="fas fa-print"></i></button>
          `
        } else if (order.status === "denied") {
          actionsHtml = `
            <button class="action-btn view-po" data-id="${order.id}" title="Ver"><i class="fas fa-eye"></i></button>
            <button class="action-btn delete-po" data-id="${order.id}" title="Eliminar"><i class="fas fa-trash"></i></button>
          `
        }

        row.innerHTML = `
          <td>${order.po_number}</td>
          <td>${formatDate(order.fecha)}</td>
          <td>${order.proveedor_nombre}</td>
          <td>${formatCurrency(order.total)}</td>
          <td>${order.status}</td>
          <td>
              ${actionsHtml}
          </td>
      `
        tbody.appendChild(row)
      })
      setupSupplierPurchaseOrderActions()
    })
    .catch((error) => console.error("Error al cargar órdenes de compra de proveedor:", error))
}

// Setup Supplier Purchase Order Actions
function setupSupplierPurchaseOrderActions() {
  document.querySelectorAll("#supplier-purchase-orders-table .action-btn.approve-po").forEach((button) => {
    button.addEventListener("click", function () {
      const orderId = this.getAttribute("data-id")
      approveSupplierPurchaseOrder(orderId)
    })
  })

  document.querySelectorAll("#supplier-purchase-orders-table .action-btn.deny-po").forEach((button) => {
    button.addEventListener("click", function () {
      const orderId = this.getAttribute("data-id")
      denySupplierPurchaseOrder(orderId)
    })
  })

  document.querySelectorAll("#supplier-purchase-orders-table .action-btn.view-po").forEach((button) => {
    button.addEventListener("click", function () {
      const orderId = this.getAttribute("data-id")
      viewSupplierPurchaseOrder(orderId)
    })
  })

  document.querySelectorAll("#supplier-purchase-orders-table .action-btn.delete-po").forEach((button) => {
    button.addEventListener("click", function () {
      const orderId = this.getAttribute("data-id")
      deleteSupplierPurchaseOrder(orderId)
    })
  })

  document.querySelectorAll("#supplier-purchase-orders-table .action-btn.print-po").forEach((button) => {
    button.addEventListener("click", function () {
      const orderId = this.getAttribute("data-id")
      fetch(`/api/ordenes_compra_proveedor/${orderId}`)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`)
          }
          return response.json()
        })
        .then((data) => {
          printSupplierPurchaseOrderContent(data, data.items)
        })
        .catch((error) => {
          console.error("Error al cargar la orden de compra para imprimir:", error)
          displayFlashMessage(`Error al cargar la orden de compra para imprimir: ${error.message}`, "error")
        })
    })
  })
}

// Approve Supplier Purchase Order
function approveSupplierPurchaseOrder(orderId) {
  if (confirm("¿Está seguro que desea APROBAR esta orden de compra?")) {
    fetch(`/api/ordenes_compra_proveedor/approve/${orderId}`, {
      method: "POST",
    })
      .then(async (response) => {
        const responseText = await response.text()
        let data
        try {
          data = JSON.parse(responseText)
        } catch (e) {
          data = { success: response.ok, message: responseText || `Error HTTP: ${response.status}` }
        }
        if (response.ok) return data
        else throw new Error(data.message || `Error HTTP: ${response.status}`)
      })
      .then((data) => {
        displayFlashMessage(data.message, data.success ? "success" : "error")
        loadSupplierPurchaseOrdersTable()
      })
      .catch((error) => {
        console.error("Error:", error)
        displayFlashMessage(`Error al aprobar orden de compra: ${error.message}`, "error")
      })
  }
}

// Deny Supplier Purchase Order
function denySupplierPurchaseOrder(orderId) {
  if (confirm("¿Está seguro que desea DENEGAR esta orden de compra?")) {
    fetch(`/api/ordenes_compra_proveedor/deny/${orderId}`, {
      method: "POST",
    })
      .then(async (response) => {
        const responseText = await response.text()
        let data
        try {
          data = JSON.parse(responseText)
        } catch (e) {
          data = { success: response.ok, message: responseText || `Error HTTP: ${response.status}` }
        }
        if (response.ok) return data
        else throw new Error(data.message || `Error HTTP: ${response.status}`)
      })
      .then((data) => {
        displayFlashMessage(data.message, data.success ? "success" : "error")
        loadSupplierPurchaseOrdersTable()
      })
      .catch((error) => {
        console.error("Error:", error)
        displayFlashMessage(`Error al denegar orden de compra: ${error.message}`, "error")
      })
  }
}

// View Supplier Purchase Order
function viewSupplierPurchaseOrder(orderId) {
  const modal = document.getElementById("supplier-purchase-order-details-modal")
  const modalPoNumber = document.getElementById("modal_supplier_po_number")
  const modalPoDate = document.getElementById("modal_supplier_po_date")
  const modalSupplierName = document.getElementById("modal_supplier_name")
  const modalSupplierRif = document.getElementById("modal_supplier_rif")
  const modalSupplierAddress = document.getElementById("modal_supplier_address")
  const modalSupplierContact = document.getElementById("modal_supplier_contact")
  const modalSupplierPhone = document.getElementById("modal_supplier_phone")
  const modalItemsTbody = document.getElementById("modal-supplier-po-items-tbody")
  const modalTotalToPay = document.getElementById("modal_supplier_total_to_pay")
  const modalTotalWords = document.getElementById("modal_supplier_total_words")
  const modalApproveBtn = document.getElementById("modal-supplier-po-approve-btn")
  const modalDenyBtn = document.getElementById("modal-supplier-po-deny-btn")
  const modalPrintBtn = document.getElementById("modal-supplier-po-print-btn")

  fetch(`/api/ordenes_compra_proveedor/${orderId}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`)
      }
      return response.json()
    })
    .then((data) => {
      modalPoNumber.textContent = data.po_number
      modalPoDate.textContent = formatDate(data.fecha)
      modalSupplierName.textContent = data.proveedor_nombre
      modalSupplierRif.textContent = data.proveedor_rif
      modalSupplierAddress.textContent = data.proveedor_direccion
      modalSupplierContact.textContent = data.proveedor_contacto || "N/A"
      modalSupplierPhone.textContent = data.proveedor_telefono || "N/A"

      modalItemsTbody.innerHTML = ""
      data.items.forEach((item) => {
        const tr = document.createElement("tr")
        tr.innerHTML = `
                  <td style="border: 1px solid #ddd; padding: 8px;">${item.nombre_material}</td>
                  <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${item.cantidad.toLocaleString("es-ES")}</td>
                  <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${item.unidad_medida}</td>
                  <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatCurrency(item.precio_unitario)}</td>
                  <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatCurrency(item.subtotal_item)}</td>
              `
        modalItemsTbody.appendChild(tr)
      })

      modalTotalToPay.textContent = formatCurrency(data.total)
      modalTotalWords.textContent = convertNumberToWords(data.total)

      // Set data-id for action buttons in the modal
      modalApproveBtn.setAttribute("data-id", orderId)
      modalDenyBtn.setAttribute("data-id", orderId)
      modalPrintBtn.setAttribute("data-id", orderId)

      // Conditional display of action buttons
      if (data.status === "pending") {
        modalApproveBtn.style.display = "inline-block"
        modalDenyBtn.style.display = "inline-block"
        modalPrintBtn.style.display = "none"
      } else if (data.status === "approved") {
        modalApproveBtn.style.display = "none"
        modalDenyBtn.style.display = "none"
        modalPrintBtn.style.display = "inline-block"
      } else if (data.status === "denied") {
        modalApproveBtn.style.display = "none"
        modalDenyBtn.style.display = "none"
        modalPrintBtn.style.display = "none"
      }

      modal.style.display = "flex"
    })
    .catch((error) => {
      console.error("Error al cargar la orden de compra:", error)
      displayFlashMessage(`Error al cargar la orden de compra: ${error.message}`, "error")
    })
}

// Setup Supplier Purchase Order Modal
function setupSupplierPurchaseOrderModal() {
  const modal = document.getElementById("supplier-purchase-order-details-modal")
  if (!modal) return

  const closeBtn = modal.querySelector(".close-supplier-po-details-modal")
  closeBtn.addEventListener("click", () => {
    modal.style.display = "none"
  })

  window.addEventListener("click", (event) => {
    if (event.target === modal) {
      modal.style.display = "none"
    }
  })

  // Setup action buttons within the modal
  const modalApproveBtn = document.getElementById("modal-supplier-po-approve-btn")
  const modalDenyBtn = document.getElementById("modal-supplier-po-deny-btn")
  const modalPrintBtn = document.getElementById("modal-supplier-po-print-btn")

  modalApproveBtn.addEventListener("click", function () {
    const orderId = this.getAttribute("data-id")
    approveSupplierPurchaseOrder(orderId)
    modal.style.display = "none" // Close modal after action
  })

  modalDenyBtn.addEventListener("click", function () {
    const orderId = this.getAttribute("data-id")
    denySupplierPurchaseOrder(orderId)
    modal.style.display = "none" // Close modal after action
  })

  modalPrintBtn.addEventListener("click", function () {
    const orderId = this.getAttribute("data-id")
    fetch(`/api/ordenes_compra_proveedor/${orderId}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`)
        }
        return response.json()
      })
      .then((data) => {
        printSupplierPurchaseOrderContent(data, data.items)
      })
      .catch((error) => {
        console.error("Error al cargar la orden de compra para imprimir:", error)
        displayFlashMessage(`Error al cargar la orden de compra para imprimir: ${error.message}`, "error")
      })
  })
}

// Delete Supplier Purchase Order
function deleteSupplierPurchaseOrder(orderId) {
  if (confirm("¿Está seguro que desea eliminar esta orden de compra?")) {
    fetch(`/api/ordenes_compra_proveedor/delete/${orderId}`, {
      method: "POST",
    })
      .then(async (response) => {
        const responseText = await response.text()
        let data
        try {
          data = JSON.parse(responseText)
        } catch (e) {
          data = { success: response.ok, message: responseText || `Error HTTP: ${response.status}` }
        }
        if (response.ok) return data
        else throw new Error(data.message || `Error HTTP: ${response.status}`)
      })
      .then((data) => {
        displayFlashMessage(data.message, data.success ? "success" : "error")
        loadSupplierPurchaseOrdersTable()
      })
      .catch((error) => {
        console.error("Error:", error)
        displayFlashMessage(`Error al eliminar orden de compra: ${error.message}`, "error")
      })
  }
}

// Load Inventory Table
function loadInventoryTable() {
  const table = document.getElementById("inventory-table")
  if (!table) return

  const tbody = table.querySelector("tbody")

  fetch("/api/inventario")
    .then((response) => response.json())
    .then((data) => {
      tbody.innerHTML = ""
      data.forEach((item) => {
        const row = document.createElement("tr")
        row.innerHTML = `
          <td>${item.nombre}</td>
          <td>${item.cantidad}</td>
          <td>${item.unidad}</td>
          <td>${item.densidad || "N/A"}</td>
          <td>
              <button class="action-btn edit" data-id="${item.id}" title="Editar"><i class="fas fa-edit"></i></button>
              <button class="action-btn delete" data-id="${item.id}" title="Eliminar"><i class="fas fa-trash"></i></button>
          </td>
      `
        tbody.appendChild(row)
      })
      setupInventoryActions()
    })
    .catch((error) => console.error("Error al cargar inventario:", error))
}

// Setup Inventory Actions (Add/Edit/Delete)
function setupInventoryActions() {
  const addInventoryBtn = document.getElementById("add-inventory-btn")
  if (addInventoryBtn) {
    addInventoryBtn.addEventListener("click", () => {
      openInventoryModal("add")
    })
  }

  const editButtons = document.querySelectorAll("#inventory-table .action-btn.edit")
  editButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const itemId = this.getAttribute("data-id")
      openInventoryModal("edit", itemId)
    })
  })

  const deleteButtons = document.querySelectorAll("#inventory-table .action-btn.delete")
  deleteButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const itemId = this.getAttribute("data-id")
      deleteInventory(itemId)
    })
  })
}

// Open Inventory Modal (Add/Edit)
function openInventoryModal(mode, itemId = null) {
  const modal = document.getElementById("inventory-form-modal")
  const form = document.getElementById("inventory-form")
  const title = document.getElementById("form-title-inventory")
  const inventoryIdEdit = document.getElementById("inventory_id_edit")
  const nombreInput = document.getElementById("nombre_inventory_edit")
  const cantidadInput = document.getElementById("cantidad_inventory_edit")
  const unidadInput = document.getElementById("unidad_inventory_edit")
  const densidadInput = document.getElementById("densidad_inventory_edit")

  form.reset()

  if (mode === "add") {
    title.textContent = "Agregar Material al Inventario"
    form.action = "/api/inventario"
    inventoryIdEdit.value = ""
  } else if (mode === "edit" && itemId) {
    title.textContent = "Editar Material del Inventario"
    form.action = `/api/inventario/${itemId}`
    inventoryIdEdit.value = itemId

    fetch(`/api/inventario/${itemId}`)
      .then((response) => response.json())
      .then((data) => {
        nombreInput.value = data.nombre
        cantidadInput.value = data.cantidad
        unidadInput.value = data.unidad
        densidadInput.value = data.densidad || ""
      })
      .catch((error) => console.error("Error al cargar datos del inventario:", error))
  }

  modal.style.display = "block"
}

// Setup Inventory Modal
function setupInventoryModal() {
  const modal = document.getElementById("inventory-form-modal")
  if (modal) {
    const closeBtn = modal.querySelector(".close")
    closeBtn.addEventListener("click", () => {
      modal.style.display = "none"
    })

    const form = document.getElementById("inventory-form")
    form.addEventListener("submit", (e) => {
      e.preventDefault()

      const formData = new FormData(form)
      const itemId = document.getElementById("inventory_id_edit").value
      const url = itemId ? `/api/inventario/${itemId}` : "/api/inventario"

      fetch(url, {
        method: "POST",
        body: formData,
      })
        .then(async (response) => {
          const responseText = await response.text()
          let data
          try {
            data = JSON.parse(responseText)
          } catch (e) {
            data = { success: response.ok, message: responseText || `Error HTTP: ${response.status}` }
          }
          if (response.ok) return data
          else throw new Error(data.message || `Error HTTP: ${response.status}`)
        })
        .then((data) => {
          displayFlashMessage(data.message, "success")
          modal.style.display = "none"
          loadInventoryTable()
        })
        .catch((error) => {
          console.error("Error:", error)
          displayFlashMessage(`Error al guardar material: ${error.message}`, "error")
        })
    })

    window.addEventListener("click", (event) => {
      if (event.target === modal) {
        modal.style.display = "none"
      }
    })
  }
}

// Delete Inventory Item
function deleteInventory(itemId) {
  if (confirm("¿Está seguro que desea eliminar este material del inventario?")) {
    fetch(`/api/inventario/delete/${itemId}`, {
      method: "POST",
    })
      .then(async (response) => {
        const responseText = await response.text()
        let data
        try {
          data = JSON.parse(responseText)
        } catch (e) {
          data = { success: response.ok, message: responseText || `Error HTTP: ${response.status}` }
        }
        if (response.ok) return data
        else throw new Error(data.message || `Error HTTP: ${response.status}`)
      })
      .then((data) => {
        displayFlashMessage(data.message, data.success ? "success" : "error")
        loadInventoryTable()
      })
      .catch((error) => {
        console.error("Error:", error)
        displayFlashMessage(`Error al eliminar material: ${error.message}`, "error")
      })
  }
}

// Load Concrete Designs Table
function loadConcreteDesignsTable() {
  const table = document.getElementById("concrete-designs-table")
  if (!table) return

  const tbody = table.querySelector("tbody")

  fetch("/api/concrete_designs")
    .then((response) => response.json())
    .then((data) => {
      tbody.innerHTML = ""
      data.forEach((design) => {
        const materialsList = design.materiales.map((m) => `${m.material_name}: ${m.quantity_kg} kg`).join(", ")
        const row = document.createElement("tr")
        row.innerHTML = `
          <td>${design.nombre}</td>
          <td>${design.resistencia}</td>
          <td>${design.asentamiento}</td>
          <td>${materialsList || "N/A"}</td>
          <td>
              <button class="action-btn edit" data-id="${design.id}" title="Editar"><i class="fas fa-edit"></i></button>
              <button class="action-btn delete" data-id="${design.id}" title="Eliminar"><i class="fas fa-trash"></i></button>
          </td>
      `
        tbody.appendChild(row)
      })
      setupConcreteDesignActions()
    })
    .catch((error) => console.error("Error al cargar diseños de concreto:", error))
}

// Setup Concrete Design Actions (Add/Edit/Delete)
function setupConcreteDesignActions() {
  const addDesignBtn = document.getElementById("add-design-btn")
  if (addDesignBtn) {
    addDesignBtn.addEventListener("click", () => {
      openConcreteDesignModal("add")
    })
  }

  const editButtons = document.querySelectorAll("#concrete-designs-table .action-btn.edit")
  editButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const designId = this.getAttribute("data-id")
      openConcreteDesignModal("edit", designId)
    })
  })

  const deleteButtons = document.querySelectorAll("#concrete-designs-table .action-btn.delete")
  deleteButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const designId = this.getAttribute("data-id")
      deleteConcreteDesign(designId)
    })
  })
}

// Open Concrete Design Modal (Add/Edit)
function openConcreteDesignModal(mode, designId = null) {
  const modal = document.getElementById("concrete-design-form-modal")
  const form = document.getElementById("concrete-design-form")
  const title = document.getElementById("form-title-design")
  const designIdEdit = document.getElementById("design_id_edit")
  const nombreInput = document.getElementById("nombre_design_edit")
  const resistenciaInput = document.getElementById("resistencia_design_edit")
  const asentamientoInput = document.getElementById("asentamiento_design_edit")
  const materialsContainer = document.getElementById("design_materials_container")

  form.reset()
  materialsContainer.innerHTML = "" // Clear existing materials

  function addMaterialRow(material = {}) {
    const materialRow = document.createElement("div")
    materialRow.classList.add("design-material-row")
    materialRow.innerHTML = `
          <input type="text" class="design-material-name" placeholder="Nombre Material" value="${material.material_name || ""}" style="width: 50%;" required>
          <input type="number" class="design-material-quantity" placeholder="Cantidad (kg)" value="${material.quantity_kg || ""}" min="0.01" step="0.01" style="width: 30%;" required>
          <button type="button" class="remove-design-material-btn" style="background: none; border: none; color: red; cursor: pointer; font-size: 1.2em;">&times;</button>
      `
    materialsContainer.appendChild(materialRow)
    materialRow.querySelector(".remove-design-material-btn").addEventListener("click", () => {
      materialRow.remove()
    })
  }

  document.getElementById("add-design-material-btn").onclick = () => addMaterialRow()

  if (mode === "add") {
    title.textContent = "Agregar Diseño de Concreto"
    form.action = "/api/concrete_designs"
    designIdEdit.value = ""
    addMaterialRow() // Add one empty material row for new design
  } else if (mode === "edit" && designId) {
    title.textContent = "Editar Diseño de Concreto"
    form.action = `/api/concrete_designs/${designId}`
    designIdEdit.value = designId

    fetch(`/api/concrete_designs/${designId}`)
      .then((response) => response.json())
      .then((data) => {
        nombreInput.value = data.nombre
        resistenciaInput.value = data.resistencia
        asentamientoInput.value = data.asentamiento
        if (data.materiales && data.materiales.length > 0) {
          data.materiales.forEach((material) => addMaterialRow(material))
        } else {
          addMaterialRow() // Add an empty row if no materials
        }
      })
      .catch((error) => console.error("Error al cargar datos del diseño:", error))
  }

  modal.style.display = "block"
}

// Setup Concrete Design Modal
function setupConcreteDesignModal() {
  const modal = document.getElementById("concrete-design-form-modal")
  if (modal) {
    const closeBtn = modal.querySelector(".close")
    closeBtn.addEventListener("click", () => {
      modal.style.display = "none"
    })

    const form = document.getElementById("concrete-design-form")
    form.addEventListener("submit", (e) => {
      e.preventDefault()

      const formData = new FormData(form)
      const designId = document.getElementById("design_id_edit").value
      const url = designId ? `/api/concrete_designs/${designId}` : "/api/concrete_designs"

      const materials = []
      document.querySelectorAll(".design-material-row").forEach((row) => {
        const name = row.querySelector(".design-material-name").value
        const quantity = row.querySelector(".design-material-quantity").value
        if (name && quantity) {
          materials.push({
            material_name: name,
            quantity_kg: Number.parseFloat(quantity),
          })
        }
      })
      formData.append("materiales", JSON.stringify(materials))

      fetch(url, {
        method: "POST", // Use POST for both add and update as per Flask API
        headers: {
          "Content-Type": "application/json", // Send as JSON
        },
        body: JSON.stringify({
          id: designId, // Include ID for update
          nombre: document.getElementById("nombre_design_edit").value,
          resistencia: Number.parseFloat(document.getElementById("resistencia_design_edit").value),
          asentamiento: Number.parseFloat(document.getElementById("asentamiento_design_edit").value),
          materiales: materials,
        }),
      })
        .then(async (response) => {
          const responseText = await response.text()
          let data
          try {
            data = JSON.parse(responseText)
          } catch (e) {
            data = { success: response.ok, message: responseText || `Error HTTP: ${response.status}` }
          }
          if (response.ok) return data
          else throw new Error(data.message || `Error HTTP: ${response.status}`)
        })
        .then((data) => {
          displayFlashMessage(data.message, "success")
          modal.style.display = "none"
          loadConcreteDesignsTable()
        })
        .catch((error) => {
          console.error("Error:", error)
          displayFlashMessage(`Error al guardar diseño: ${error.message}`, "error")
        })
    })

    window.addEventListener("click", (event) => {
      if (event.target === modal) {
        modal.style.display = "none"
      }
    })
  }
}

// Delete Concrete Design
function deleteConcreteDesign(designId) {
  if (confirm("¿Está seguro que desea eliminar este diseño de concreto?")) {
    fetch(`/api/concrete_designs/delete/${designId}`, {
      method: "POST",
    })
      .then(async (response) => {
        const responseText = await response.text()
        let data
        try {
          data = JSON.parse(responseText)
        } catch (e) {
          data = { success: response.ok, message: responseText || `Error HTTP: ${response.status}` }
        }
        if (response.ok) return data
        else throw new Error(data.message || `Error HTTP: ${response.status}`)
      })
      .then((data) => {
        displayFlashMessage(data.message, data.success ? "success" : "error")
        loadConcreteDesignsTable()
      })
      .catch((error) => {
        console.error("Error:", error)
        displayFlashMessage(`Error al eliminar diseño: ${error.message}`, "error")
      })
  }
}

// Load Maintenance Table
function loadMaintenanceTable() {
  const table = document.getElementById("maintenance-table")
  if (!table) return

  const tbody = table.querySelector("tbody")

  fetch("/api/mantenimiento")
    .then((response) => response.json())
    .then((data) => {
      tbody.innerHTML = ""
      data.forEach((maintenance) => {
        const row = document.createElement("tr")
        row.innerHTML = `
          <td>${maintenance.placa || "N/A"}</td>
          <td>${formatDate(maintenance.fecha)}</td>
          <td>${maintenance.tipo_mantenimiento || "N/A"}</td>
          <td>${maintenance.descripcion}</td>
          <td>${formatCurrency(maintenance.costo)}</td>
          <td>${maintenance.kilometraje_actual}</td>
          <td>${maintenance.proximo_kilometraje_mantenimiento || "N/A"}</td>
          <td>${formatDate(maintenance.proxima_fecha_mantenimiento) || "N/A"}</td>
          <td>
              <button class="action-btn edit" data-id="${maintenance.id}" title="Editar"><i class="fas fa-edit"></i></button>
              <button class="action-btn delete" data-id="${maintenance.id}" title="Eliminar"><i class="fas fa-trash"></i></button>
          </td>
      `
        tbody.appendChild(row)
      })
      setupMaintenanceActions()
    })
    .catch((error) => console.error("Error al cargar mantenimientos:", error))
}

// Setup Maintenance Actions (Add/Edit/Delete)
function setupMaintenanceActions() {
  const addMaintenanceBtn = document.getElementById("add-maintenance-btn")
  if (addMaintenanceBtn) {
    addMaintenanceBtn.addEventListener("click", () => {
      openMaintenanceModal("add")
    })
  }

  const editButtons = document.querySelectorAll("#maintenance-table .action-btn.edit")
  editButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const maintenanceId = this.getAttribute("data-id")
      openMaintenanceModal("edit", maintenanceId)
    })
  })

  const deleteButtons = document.querySelectorAll("#maintenance-table .action-btn.delete")
  deleteButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const maintenanceId = this.getAttribute("data-id")
      deleteMaintenance(maintenanceId)
    })
  })
}

// Open Maintenance Modal (Add/Edit)
function openMaintenanceModal(mode, maintenanceId = null) {
  const modal = document.getElementById("maintenance-form-modal")
  const form = document.getElementById("maintenance-form")
  const title = document.getElementById("form-title-maintenance")
  const maintenanceIdEdit = document.getElementById("maintenance_id_edit")
  const camionSelect = document.getElementById("camion_maintenance_edit")
  const fechaInput = document.getElementById("fecha_maintenance_edit")
  const tipoSelect = document.getElementById("tipo_maintenance_edit")
  const kilometrajeInput = document.getElementById("kilometraje_actual_maintenance_edit")
  const descripcionInput = document.getElementById("descripcion_maintenance_edit")
  const costoInput = document.getElementById("costo_maintenance_edit")

  form.reset()

  // Load trucks for the select input
  fetch("/api/camiones")
    .then((response) => response.json())
    .then((data) => {
      camionSelect.innerHTML = '<option value="">Seleccione camión</option>'
      data.forEach((camion) => {
        const option = document.createElement("option")
        option.value = camion.id
        option.textContent = `${camion.placa} - ${camion.modelo}`
        camionSelect.appendChild(option)
      })
    })
    .catch((error) => console.error("Error al cargar camiones para mantenimiento:", error))

  if (mode === "add") {
    title.textContent = "Registrar Mantenimiento"
    form.action = "/api/mantenimiento"
    maintenanceIdEdit.value = ""
    fechaInput.valueAsDate = new Date() // Set today's date for new entries
    kilometrajeInput.value = "" // Clear odometer for new entry
    // Add event listener to load current odometer when truck is selected for new maintenance
    camionSelect.addEventListener("change", function () {
      const selectedTruckId = this.value
      if (selectedTruckId) {
        fetch(`/api/camiones/${selectedTruckId}/odometer`)
          .then((response) => response.json())
          .then((data) => {
            if (data.current_odometer !== undefined) {
              kilometrajeInput.value = data.current_odometer
            }
          })
          .catch((error) => console.error("Error al cargar odómetro:", error))
      } else {
        kilometrajeInput.value = ""
      }
    })
  } else if (mode === "edit" && maintenanceId) {
    title.textContent = "Editar Mantenimiento"
    form.action = `/api/mantenimiento/${maintenanceId}`
    maintenanceIdEdit.value = maintenanceId

    fetch(`/api/mantenimiento/${maintenanceId}`)
      .then((response) => response.json())
      .then((data) => {
        camionSelect.value = data.camion_id
        fechaInput.value = data.fecha
        tipoSelect.value = data.tipo_mantenimiento
        kilometrajeInput.value = data.kilometraje_actual
        descripcionInput.value = data.descripcion
        costoInput.value = data.costo
      })
      .catch((error) => console.error("Error al cargar datos del mantenimiento:", error))
  }

  modal.style.display = "block"
}

// Setup Maintenance Modal
function setupMaintenanceModal() {
  const modal = document.getElementById("maintenance-form-modal")
  if (modal) {
    const closeBtn = modal.querySelector(".close")
    closeBtn.addEventListener("click", () => {
      modal.style.display = "none"
    })

    const form = document.getElementById("maintenance-form")
    form.addEventListener("submit", (e) => {
      e.preventDefault()

      const formData = new FormData(form)
      const maintenanceId = document.getElementById("maintenance_id_edit").value
      const url = maintenanceId ? `/api/mantenimiento/${maintenanceId}` : "/api/mantenimiento"

      fetch(url, {
        method: "POST",
        body: formData,
      })
        .then(async (response) => {
          const responseText = await response.text()
          let data
          try {
            data = JSON.parse(responseText)
          } catch (e) {
            data = { success: response.ok, message: responseText || `Error HTTP: ${response.status}` }
          }
          if (response.ok) return data
          else throw new Error(data.message || `Error HTTP: ${response.status}`)
        })
        .then((data) => {
          displayFlashMessage(data.message, "success")
          modal.style.display = "none"
          loadMaintenanceTable()
        })
        .catch((error) => {
          console.error("Error:", error)
          displayFlashMessage(`Error al guardar mantenimiento: ${error.message}`, "error")
        })
    })

    window.addEventListener("click", (event) => {
      if (event.target === modal) {
        modal.style.display = "none"
      }
    })
  }
}

// Delete Maintenance
function deleteMaintenance(maintenanceId) {
  if (confirm("¿Está seguro que desea eliminar este registro de mantenimiento?")) {
    fetch(`/api/mantenimiento/delete/${maintenanceId}`, {
      method: "POST",
    })
      .then(async (response) => {
        const responseText = await response.text()
        let data
        try {
          data = JSON.parse(responseText)
        } catch (e) {
          data = { success: response.ok, message: responseText || `Error HTTP: ${response.status}` }
        }
        if (response.ok) return data
        else throw new Error(data.message || `Error HTTP: ${response.status}`)
      })
      .then((data) => {
        displayFlashMessage(data.message, data.success ? "success" : "error")
        loadMaintenanceTable()
      })
      .catch((error) => {
        console.error("Error:", error)
        displayFlashMessage(`Error al eliminar mantenimiento: ${error.message}`, "error")
      })
  }
}

// NEW: Load Registro de Guías de Despacho Table for Gerencia
function loadRegistroGuiaDespachoTable() {
  const table = document.getElementById("despachos-registro-table")
  if (!table) return

  const tbody = table.querySelector("tbody")

  fetch("/api/despachos")
    .then((response) => response.json())
    .then((data) => {
      tbody.innerHTML = ""
      if (data.length === 0) {
        tbody.innerHTML =
          '<tr><td colspan="10" style="text-align: center;">No hay guías de despacho registradas.</td></tr>'
        return
      }
      data.forEach((despacho) => {
        const row = document.createElement("tr")
        const disenoNombre = despacho.resistencia
          ? `${despacho.resistencia} kgf/cm² - ${despacho.asentamiento}"`
          : "N/A"
        let actionsHtml = ""

        if (despacho.status === "pending") {
          actionsHtml = `
            <button class="action-btn approve-dispatch" data-id="${despacho.id}" title="Aprobar"><i class="fas fa-check"></i></button>
            <button class="action-btn deny-dispatch" data-id="${despacho.id}" title="Denegar"><i class="fas fa-times"></i></button>
            <button class="action-btn view-dispatch" data-id="${despacho.id}" title="Ver"><i class="fas fa-eye"></i></button>
          `
        } else if (despacho.status === "approved") {
          actionsHtml = `
            <button class="action-btn view-dispatch" data-id="${despacho.id}" title="Ver"><i class="fas fa-eye"></i></button>
            <button class="action-btn print-dispatch" data-id="${despacho.id}" title="Imprimir"><i class="fas fa-print"></i></button>
          `
        } else if (despacho.status === "denied") {
          actionsHtml = `
            <button class="action-btn view-dispatch" data-id="${despacho.id}" title="Ver"><i class="fas fa-eye"></i></button>
          `
        }

        row.innerHTML = `
           <td>${formatDate(despacho.fecha)}</td>
           <td>${despacho.guia}</td>
           <td>${despacho.m3}</td>
           <td>${disenoNombre}</td>
           <td>${despacho.cliente_nombre || "N/A"}</td>
           <td>${despacho.chofer_nombre || "N/A"}</td>
           <td>${despacho.camion_placa || "N/A"}</td>
           <td>${despacho.vendedor_nombre || "N/A"}</td>
           <td>${despacho.status || "N/A"}</td>
           <td>
             ${actionsHtml}
           </td>
         `
        tbody.appendChild(row)
      })
      setupDispatchActionsGerencia()
    })
    .catch((error) => console.error("Error al cargar despachos para registro:", error))
}

// NEW: Setup actions for dispatch guides in Gerencia table
function setupDispatchActionsGerencia() {
  document.querySelectorAll(".approve-dispatch").forEach((button) => {
    button.addEventListener("click", function () {
      const dispatchId = this.getAttribute("data-id")
      approveDispatch(dispatchId)
    })
  })

  document.querySelectorAll(".deny-dispatch").forEach((button) => {
    button.addEventListener("click", function () {
      const dispatchId = this.getAttribute("data-id")
      denyDispatch(dispatchId)
    })
  })

  document.querySelectorAll(".view-dispatch").forEach((button) => {
    button.addEventListener("click", function () {
      const dispatchId = this.getAttribute("data-id")
      viewDispatchDetails(dispatchId)
    })
  })

  document.querySelectorAll(".print-dispatch").forEach((button) => {
    button.addEventListener("click", function () {
      const dispatchId = this.getAttribute("data-id")
      fetch(`/api/despachos/${dispatchId}`)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`)
          }
          return response.json()
        })
        .then((data) => {
          printDispatchGuideContent(data)
        })
        .catch((error) => {
          console.error("Error al cargar la guía de despacho para imprimir:", error)
          displayFlashMessage(`Error al cargar la guía de despacho para imprimir: ${error.message}`, "error")
        })
    })
  })
}

// NEW: Approve Dispatch
function approveDispatch(dispatchId) {
  if (confirm("¿Está seguro que desea APROBAR esta guía de despacho?")) {
    fetch(`/api/despachos/approve/${dispatchId}`, {
      method: "POST",
    })
      .then(async (response) => {
        const responseText = await response.text()
        let data
        try {
          data = JSON.parse(responseText)
        } catch (e) {
          data = { success: response.ok, message: responseText || `Error HTTP: ${response.status}` }
        }
        if (response.ok) return data
        else throw new Error(data.message || `Error HTTP: ${response.status}`)
      })
      .then((data) => {
        displayFlashMessage(data.message, data.success ? "success" : "error")
        loadRegistroGuiaDespachoTable()
      })
      .catch((error) => {
        console.error("Error:", error)
        displayFlashMessage(`Error al aprobar guía de despacho: ${error.message}`, "error")
      })
  }
}

// NEW: Deny Dispatch
function denyDispatch(dispatchId) {
  if (confirm("¿Está seguro que desea DENEGAR esta guía de despacho?")) {
    fetch(`/api/despachos/deny/${dispatchId}`, {
      method: "POST",
    })
      .then(async (response) => {
        const responseText = await response.text()
        let data
        try {
          data = JSON.parse(responseText)
        } catch (e) {
          data = { success: response.ok, message: responseText || `Error HTTP: ${response.status}` }
        }
        if (response.ok) return data
        else throw new Error(data.message || `Error HTTP: ${response.status}`)
      })
      .then((data) => {
        displayFlashMessage(data.message, data.success ? "success" : "error")
        loadRegistroGuiaDespachoTable()
      })
      .catch((error) => {
        console.error("Error:", error)
        displayFlashMessage(`Error al denegar guía de despacho: ${error.message}`, "error")
      })
  }
}

// NEW: View Dispatch Details in Modal
function viewDispatchDetails(dispatchId) {
  const modal = document.getElementById("dispatch-details-modal")
  const modalGuiaNumber = document.getElementById("modal_dispatch_guia_number")
  const modalDate = document.getElementById("modal_dispatch_date")
  const modalClientName = document.getElementById("modal_dispatch_client_name")
  const modalClientAddress = document.getElementById("modal_dispatch_client_address")
  const modalClientPhone = document.getElementById("modal_dispatch_client_phone")
  const modalClientDocument = document.getElementById("modal_dispatch_client_document")
  const modalChoferName = document.getElementById("modal_dispatch_chofer_name")
  const modalCamionInfo = document.getElementById("modal_dispatch_camion_info")
  const modalM3 = document.getElementById("modal_dispatch_m3")
  const modalDisenoName = document.getElementById("modal_dispatch_diseno_name")
  const modalVendedorName = document.getElementById("modal_dispatch_vendedor_name")
  const modalStatus = document.getElementById("modal_dispatch_status")
  const modalHoraSalida = document.getElementById("modal_dispatch_hora_salida")
  const modalHoraLlegada = document.getElementById("modal_dispatch_hora_llegada")
  const modalReceivedBy = document.getElementById("modal_dispatch_received_name")
  const modalReceivedSignature = document.getElementById("modal_dispatch_received_signature")
  const modalReceivedDatetime = document.getElementById("modal_dispatch_received_datetime")

  const modalApproveBtn = document.getElementById("modal-dispatch-approve-btn")
  const modalDenyBtn = document.getElementById("modal-dispatch-deny-btn")
  const modalPrintBtn = document.getElementById("modal-dispatch-print-btn")

  fetch(`/api/despachos/${dispatchId}`)
    .then((response) => {
      if (!response.ok) throw new Error(`Error HTTP: ${response.status}`)
      return response.json()
    })
    .then((data) => {
      modalGuiaNumber.textContent = data.guia || "N/A"
      modalDate.textContent = formatDate(data.fecha)
      modalClientName.textContent = data.cliente_nombre || "N/A"
      modalClientAddress.textContent = data.cliente_direccion || "N/A"
      modalClientPhone.textContent = data.cliente_telefono || "N/A"
      modalClientDocument.textContent = data.cliente_documento || "N/A"
      modalChoferName.textContent = data.chofer_nombre || "N/A"
      modalCamionInfo.textContent = `${data.camion_placa || "N/A"} - ${data.camion_modelo || "N/A"}`
      modalM3.textContent = data.m3 || "N/A"
      modalDisenoName.textContent = `${data.diseno_nombre || "N/A"} (${data.diseno_resistencia} kgf/cm² - ${data.diseno_asentamiento}")`
      modalVendedorName.textContent = data.vendedor_nombre || "N/A"
      modalStatus.textContent = data.status || "N/A"
      modalHoraSalida.textContent = data.hora_salida || "N/A"
      modalHoraLlegada.textContent = data.hora_llegada || "N/A"
      modalReceivedBy.textContent = data.received_by || "SIN RELLENAR"
      modalReceivedSignature.textContent = "SIN RELLENAR" // This is a placeholder for signature
      modalReceivedDatetime.textContent = "SIN RELLENAR" // This is a placeholder for datetime

      // Set data-id for action buttons in the modal
      modalApproveBtn.setAttribute("data-id", dispatchId)
      modalDenyBtn.setAttribute("data-id", dispatchId)
      modalPrintBtn.setAttribute("data-id", dispatchId)

      // Conditional display of action buttons
      if (data.status === "pending") {
        modalApproveBtn.style.display = "inline-block"
        modalDenyBtn.style.display = "inline-block"
        modalPrintBtn.style.display = "none"
      } else if (data.status === "approved") {
        modalApproveBtn.style.display = "none"
        modalDenyBtn.style.display = "none"
        modalPrintBtn.style.display = "inline-block"
      } else if (data.status === "denied") {
        modalApproveBtn.style.display = "none"
        modalDenyBtn.style.display = "none"
        modalPrintBtn.style.display = "none"
      }

      modal.style.display = "flex"
    })
    .catch((error) => {
      console.error("Error al cargar detalles de despacho:", error)
      displayFlashMessage(`Error al cargar detalles de despacho: ${error.message}`, "error")
    })
}

// NEW: Setup Dispatch Details Modal
function setupDispatchDetailsModal() {
  const modal = document.getElementById("dispatch-details-modal")
  if (!modal) return

  const closeBtn = modal.querySelector(".close-dispatch-details-modal")
  closeBtn.addEventListener("click", () => {
    modal.style.display = "none"
  })

  window.addEventListener("click", (event) => {
    if (event.target === modal) {
      modal.style.display = "none"
    }
  })

  // Setup action buttons within the modal
  const modalApproveBtn = document.getElementById("modal-dispatch-approve-btn")
  const modalDenyBtn = document.getElementById("modal-dispatch-deny-btn")
  const modalPrintBtn = document.getElementById("modal-dispatch-print-btn")

  modalApproveBtn.addEventListener("click", function () {
    const dispatchId = this.getAttribute("data-id")
    approveDispatch(dispatchId)
    modal.style.display = "none" // Close modal after action
  })

  modalDenyBtn.addEventListener("click", function () {
    const dispatchId = this.getAttribute("data-id")
    denyDispatch(dispatchId)
    modal.style.display = "none" // Close modal after action
  })

  modalPrintBtn.addEventListener("click", function () {
    const dispatchId = this.getAttribute("data-id")
    fetch(`/api/despachos/${dispatchId}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`)
        }
        return response.json()
      })
      .then((data) => {
        printDispatchGuideContent(data)
      })
      .catch((error) => {
        console.error("Error al cargar la guía de despacho para imprimir:", error)
        displayFlashMessage(`Error al cargar la guía de despacho para imprimir: ${error.message}`, "error")
      })
  })
}

// NEW: Print Dispatch Guide Content
function printDispatchGuideContent(dispatchData) {
  const guiaNumber = dispatchData.guia || "N/A"
  const date = formatDate(dispatchData.fecha)
  const clientName = dispatchData.cliente_nombre || "N/A"
  const clientAddress = dispatchData.cliente_direccion || "N/A"
  const clientPhone = dispatchData.cliente_telefono || "N/A"
  const clientDocument = dispatchData.cliente_documento || "N/A"
  const choferName = dispatchData.chofer_nombre || "N/A"
  const camionInfo = `${dispatchData.camion_placa || "N/A"} - ${dispatchData.camion_modelo || "N/A"}`
  const m3 = dispatchData.m3 || "N/A"
  const disenoName = `${dispatchData.diseno_nombre || "N/A"} (${dispatchData.diseno_resistencia} kgf/cm² - ${dispatchData.diseno_asentamiento}")`
  const vendedorName = dispatchData.vendedor_nombre || "N/A"
  const status = dispatchData.status || "N/A"
  const horaSalida = dispatchData.hora_salida || "N/A"
  const horaLlegada = dispatchData.hora_llegada || "N/A"
  const receivedBy = dispatchData.received_by || "SIN RELLENAR"
  const receivedSignature = "SIN RELLENAR" // Placeholder
  const receivedDatetime = "SIN RELLENAR" // Placeholder

  const printableContent = `
  <html lang="es">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Guía de Despacho ${guiaNumber}</title>
      <style>
          body { font-family: 'Poppins', sans-serif; margin: 20px; color: #333; }
          .container { width: 100%; max-width: 800px; margin: 0 auto; padding: 20px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0,0,0,0.05); }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
          .company-info img { max-width: 300px; height: auto; margin-bottom: 5px; }
          .company-info p, .address-info p { margin: 0; font-size: 0.8em; }
          h4 { text-align: center; margin-bottom: 10px; }
          .dispatch-details, .received-by-section { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; font-size: 0.9em; }
          .dispatch-details p, .received-by-section p { margin: 0; }
          hr { border: 0; border-top: 1px dashed #ccc; margin: 20px 0; }
          @media print {
              body { margin: 0; }
              .container { border: none; box-shadow: none; }
          }
      </style>
  </head>
  <body>
      <div class="container">
          <div class="header">
              <div class="company-info">
                  <img src="/static/uploads/Logo Prealca Sin Fondo.png" alt="Prealca Logo">
                  <p>RIF.: J-30913171-0</p>
              </div>
              <div class="address-info">
                  <p>Av. 2 parcela E-37, Zona Ind. Sta Cruz</p>
                  <p>Estado Aragua</p>
                  <p>Telf: 04128936930 / Roberto Quintero</p>
              </div>
          </div>
          <h4>GUÍA DE DESPACHO: ${guiaNumber}</h4>
          <p style="text-align: right; margin-bottom: 20px;">Fecha: ${date}</p>
          
          <div class="dispatch-details">
              <p><strong>Cliente:</strong> ${clientName}</p>
              <p><strong>Dirección:</strong> ${clientAddress}</p>
              <p><strong>Teléfono:</strong> ${clientPhone}</p>
              <p><strong>RIF/Cédula:</strong> ${clientDocument}</p>
              <p><strong>Chofer:</strong> ${choferName}</p>
              <p><strong>Camión:</strong> ${camionInfo}</p>
              <p><strong>M3:</strong> ${m3}</p>
              <p><strong>Diseño:</strong> ${disenoName}</p>
              <p><strong>Vendedor:</strong> ${vendedorName}</p>
              <p><strong>Estado:</strong> ${status}</p>
              <p><strong>Hora de Salida:</strong> ${horaSalida}</p>
              <p><strong>Hora de Llegada:</strong> ${horaLlegada}</p>
          </div>

          <hr>

          <div class="received-by-section">
              <p><strong>RECIBIDO POR:</strong></p>
              <p><strong>Firma:</strong> ${receivedSignature}</p>
              <p><strong>Nombre:</strong> ${receivedBy}</p>
              <p><strong>Fecha y Hora:</strong> ${receivedDatetime}</p>
          </div>
      </div>
  </body>
  </html>
  `

  const printWindow = window.open("", "_blank")
  if (printWindow) {
    printWindow.document.write(printableContent)
    printWindow.document.close()
    printWindow.focus()
    printWindow.onload = () => {
      printWindow.print()
      // Optional: close window after print dialog is dismissed
      // printWindow.onafterprint = function() { printWindow.close(); };
    }
  } else {
    displayFlashMessage("No se pudo abrir la ventana de impresión. Por favor, permita pop-ups.", "error")
  }
}

// Heartbeat function to keep user status online
function startHeartbeat() {
  // Send a heartbeat every 30 seconds (30,000 ms)
  setInterval(() => {
    fetch("/api/user/heartbeat", {
      method: "POST",
      credentials: "same-origin",
    })
      .then((response) => {
        if (!response.ok) {
          console.warn("Heartbeat failed, user might be logged out or session expired.")
        }
      })
      .catch((error) => {
        console.error("Error sending heartbeat:", error)
      })
  }, 30000) // 30 seconds
}

// Utility functions
function formatDate(dateString) {
  if (!dateString) return "N/A"
  const date = new Date(dateString)
  return date.toLocaleDateString("es-ES")
}

function formatCurrency(value) {
  return new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: "VES",
  }).format(value)
}

function displayFlashMessage(message, category) {
  const flashMessagesDiv = document.getElementById("flash-messages")
  if (flashMessagesDiv) {
    flashMessagesDiv.innerHTML = `<div class="alert alert-${category}">${message}</div>`
    setTimeout(() => {
      flashMessagesDiv.innerHTML = ""
    }, 5000)
  }
}

// Function to convert number to words (for "Son:" field in PDF)
function convertNumberToWords(num) {
  const units = ["", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"]
  const teens = [
    "diez",
    "once",
    "doce",
    "trece",
    "catorce",
    "quince",
    "dieciséis",
    "diecisiete",
    "dieciocho",
    "diecinueve",
  ]
  const tens = ["", "", "veinte", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"]
  const hundreds = [
    "",
    "ciento",
    "doscientos",
    "trescientos",
    "cuatrocientos",
    "quinientos",
    "seiscientos",
    "setecientos",
    "ochocientos",
    "novecientos",
  ]

  function convertGroup(n) {
    let s = ""
    const h = Math.floor(n / 100)
    const t = Math.floor((n % 100) / 10)
    const u = n % 10

    if (h > 0) {
      s += hundreds[h] + " "
    }
    if (t === 1) {
      s += teens[u]
    } else if (t > 1) {
      s += tens[t]
      if (u > 0) s += " y " + units[u]
    } else if (u > 0) {
      s += units[u]
    }
    return s.trim()
  }

  if (num === 0) return "cero"

  let integerPart = Math.floor(num)
  const decimalPart = Math.round((num - integerPart) * 100)

  let words = ""

  if (integerPart >= 1000000000) {
    words += convertGroup(Math.floor(integerPart / 1000000000)) + " mil millones "
    integerPart %= 1000000000
  }
  if (integerPart >= 1000000) {
    const millions = Math.floor(integerPart / 1000000)
    if (millions === 1) {
      words += "un millón "
    } else {
      words += convertGroup(millions) + " millones "
    }
    integerPart %= 1000000
  }
  if (integerPart >= 1000) {
    const thousands = Math.floor(integerPart / 1000)
    if (thousands === 1) {
      words += "mil "
    } else {
      words += convertGroup(thousands) + " mil "
    }
    integerPart %= 1000
  }
  if (integerPart > 0) {
    words += convertGroup(integerPart)
  }

  words = words.trim()

  if (decimalPart > 0) {
    words += ` con ${decimalPart.toString().padStart(2, "0")}/100`
  } else {
    words += ` con 00/100`
  }

  return words.toUpperCase() + " BOLÍVARES"
}
