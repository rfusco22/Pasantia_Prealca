document.addEventListener("DOMContentLoaded", () => {
  // Cargar datos del usuario
  loadUserInfo()

  // Configurar navegación del sidebar
  setupSidebarNavigation()

  // Configurar cierre de sesión
  setupLogout()

  // Cargar datos iniciales
  loadInitialData()

  // Configurar modales
  setupModals()

  // Configurar formularios principales
  setupMainClienteForm()
  setupMainCamionForm()
  // Removed setupMainVendedorForm() as the form is removed from HTML for 'Registro' role
  setupMainChoferForm()
  setupMainProveedorForm() // NEW: Setup main supplier form
  setupMainMantenimientoForm() // NEW: Setup main maintenance form

  // Configurar formularios de edición (modals)
  setupClientesForm()
  setupCamionesForm()
  setupChoferesForm()
  setupVendedoresForm()
  setupProveedoresForm() // NEW: Setup supplier edit form
  setupMantenimientoForm() // NEW: Setup maintenance edit form

  const placaCamion = document.getElementById("placa_camion")
  if (placaCamion) {
    const validateCamionPlaca = () => {
      validateVenezuelanPlate(placaCamion.value, "placa_camion_error")
    }
    placaCamion.addEventListener("input", validateCamionPlaca)
  }

  const placaCamionEdit = document.getElementById("placa_camion_edit")
  if (placaCamionEdit) {
    const validateCamionEditPlaca = () => {
      validateVenezuelanPlate(placaCamionEdit.value, "placa_camion_edit_error")
    }
    placaCamionEdit.addEventListener("input", validateCamionEditPlaca)
  }

  const choferDocType = document.getElementById("documento_chofer_type")
  const choferDocNumber = document.getElementById("documento_chofer_number")
  if (choferDocType && choferDocNumber) {
    const validateChoferDoc = () => {
      validateVenezuelanDocument(choferDocType.value, choferDocNumber.value, false, "documento_chofer_error")
    }
    choferDocType.addEventListener("change", validateChoferDoc)
    choferDocNumber.addEventListener("input", validateChoferDoc)
  }

  const choferDocEditType = document.getElementById("documento_chofer_edit_type")
  const choferDocEditNumber = document.getElementById("documento_chofer_edit_number")
  if (choferDocEditType && choferDocEditNumber) {
    const validateChoferEditDoc = () => {
      validateVenezuelanDocument(
        choferDocEditType.value,
        choferDocEditNumber.value,
        false,
        "documento_chofer_edit_error",
      )
    }
    choferDocEditType.addEventListener("change", validateChoferEditDoc)
    choferDocEditNumber.addEventListener("input", validateChoferEditDoc)
  }

  const vendedorDocType = document.getElementById("documento_vendedor_type")
  const vendedorDocNumber = document.getElementById("documento_vendedor_number")
  if (vendedorDocType && vendedorDocNumber) {
    const validateVendedorDoc = () => {
      validateVenezuelanDocument(vendedorDocType.value, vendedorDocNumber.value, false, "documento_vendedor_error")
    }
    vendedorDocType.addEventListener("change", validateVendedorDoc)
    vendedorDocNumber.addEventListener("input", validateVendedorDoc)
  }

  const vendedorDocEditType = document.getElementById("documento_vendedor_edit_type")
  const vendedorDocEditNumber = document.getElementById("documento_vendedor_edit_number")
  if (vendedorDocEditType && vendedorDocEditNumber) {
    const validateVendedorEditDoc = () => {
      validateVenezuelanDocument(
        vendedorDocEditType.value,
        vendedorDocEditNumber.value,
        false,
        "documento_vendedor_edit_error",
      )
    }
    vendedorDocEditType.addEventListener("change", validateVendedorEditDoc)
    vendedorDocEditNumber.addEventListener("input", validateVendedorEditDoc)
  }
})

// Cargar información del usuario
function loadUserInfo() {
  const userName = document.getElementById("user-name")

  if (window.userInfo && window.userInfo.nombreCompleto) {
    if (userName.textContent === "Cargando...") {
      userName.textContent = window.userInfo.nombreCompleto
    }
    sessionStorage.setItem("userName", window.userInfo.nombreCompleto)
    sessionStorage.setItem("userId", window.userInfo.id)
    sessionStorage.setItem("userRole", window.userInfo.rol)
  } else {
    userName.textContent = sessionStorage.getItem("userName") || "Usuario Registro"
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

      // NEW: Load specific tables when their pages are active
      if (pageId === "proveedores") {
        loadProveedoresTable()
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

// Cargar datos iniciales
function loadInitialData() {
  loadVendedores()
  loadClientesTable()
  loadCamionesTable()
  loadChoferesTable()
  loadVendedoresTable()
  loadMantenimientoTable()
  loadCamionesForSelect() // For maintenance form
  loadProveedoresTable() // NEW: Load suppliers table
}

// Cargar vendedores para selects
function loadVendedores() {
  fetch("/api/vendedores")
    .then((response) => response.json())
    .then((data) => {
      const vendedorClienteSelect = document.getElementById("vendedor_cliente")
      const vendedorClienteEditSelect = document.getElementById("vendedor_cliente_edit")

      if (vendedorClienteSelect) {
        vendedorClienteSelect.innerHTML = '<option value="">Seleccione vendedor</option>'
        data.forEach((vendedor) => {
          const option = document.createElement("option")
          option.value = vendedor.id
          option.textContent = vendedor.nombre
          vendedorClienteSelect.appendChild(option)
        })
      }

      if (vendedorClienteEditSelect) {
        vendedorClienteEditSelect.innerHTML = '<option value="">Seleccione vendedor</option>'
        data.forEach((vendedor) => {
          const option = document.createElement("option")
          option.value = vendedor.id
          option.textContent = vendedor.nombre
          vendedorClienteEditSelect.appendChild(option)
        })
      }
    })
    .catch((error) => console.error("Error al cargar vendedores:", error))
}

// Cargar camiones para selects (for maintenance form)
function loadCamionesForSelect() {
  fetch("/api/camiones")
    .then((response) => response.json())
    .then((data) => {
      const camionSelect = document.getElementById("camion_mantenimiento")
      const camionEditSelect = document.getElementById("camion_mantenimiento_edit") // NEW: For edit modal

      if (camionSelect) {
        camionSelect.innerHTML = '<option value="">Seleccione camión</option>'
        data.forEach((camion) => {
          const option = document.createElement("option")
          option.value = camion.id
          option.textContent = `${camion.placa} - ${camion.modelo}`
          option.setAttribute("data-odometer", camion.current_odometer || 0) // NEW: Store odometer
          camionSelect.appendChild(option)
        })
      }

      // NEW: Populate edit select as well
      if (camionEditSelect) {
        camionEditSelect.innerHTML = '<option value="">Seleccione camión</option>'
        data.forEach((camion) => {
          const option = document.createElement("option")
          option.value = camion.id
          option.textContent = `${camion.placa} - ${camion.modelo}`
          option.setAttribute("data-odometer", camion.current_odometer || 0)
          camionEditSelect.appendChild(option)
        })
      }
    })
    .catch((error) => console.error("Error al cargar camiones:", error))
}

// Load Clients Table
function loadClientesTable() {
  const table = document.getElementById("clientes-table")
  if (!table) return

  const tbody = table.querySelector("tbody")

  fetch("/api/clientes")
    .then((response) => response.json())
    .then((data) => {
      tbody.innerHTML = ""
      data.forEach((cliente) => {
        const row = document.createElement("tr")
        row.innerHTML = `
              <td>${cliente.nombre}</td>
              <td>${cliente.direccion}</td>
              <td>${cliente.telefono}</td>
              <td>${cliente.documento}</td>
              <td>${cliente.vendedor_nombre || "N/A"}</td>
          `
        tbody.appendChild(row)
      })
      setupClientesActions()
    })
    .catch((error) => console.error("Error al cargar clientes:", error))
}

// Setup Client Actions
function setupClientesActions() {
  const editButtons = document.querySelectorAll("#clientes-table .action-btn.edit")
  editButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const clienteId = this.getAttribute("data-id")
      editCliente(clienteId)
    })
  })

  const deleteButtons = document.querySelectorAll("#clientes-table .action-btn.delete")
  deleteButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const clienteId = this.getAttribute("data-id")
      deleteCliente(clienteId)
    })
  })
}

// Edit Client
function editCliente(clienteId) {
  fetch(`/api/clientes/${clienteId}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`)
      }
      return response.json()
    })
    .then((data) => {
      const cliente = data
      document.getElementById("cliente_id_edit").value = cliente.id
      document.getElementById("nombre_cliente_edit").value = cliente.nombre || ""
      document.getElementById("telefono_cliente_edit").value = cliente.telefono || ""

      let documentoType = "V"
      let documentoNumber = ""
      if (cliente.documento) {
        const parts = cliente.documento.split("-")
        if (parts.length === 2) {
          documentoType = parts[0]
          documentoNumber = parts[1]
        } else {
          documentoNumber = cliente.documento // Fallback if format is unexpected
        }
      }
      document.getElementById("documento_cliente_edit_type").value = documentoType
      document.getElementById("documento_cliente_edit_number").value = documentoNumber
      document.getElementById("direccion_cliente_edit").value = cliente.direccion || ""

      const vendedorSelect = document.getElementById("vendedor_cliente_edit")
      if (vendedorSelect && cliente.vendedor_id) {
        vendedorSelect.value = cliente.vendedor_id
      } else if (vendedorSelect) {
        vendedorSelect.value = ""
      }

      document.getElementById("form-title-cliente").textContent = "Editar Cliente"
      document.getElementById("cliente-form").action = `/api/clientes/${cliente.id}`
      document.getElementById("cliente-form-modal").style.display = "block"
    })
    .catch((error) => {
      console.error("Error al cargar la información del cliente:", error)
      displayFlashMessage(`Error al cargar la información del cliente: ${error.message}`, "error")
    })
}

// Delete Client
function deleteCliente(clienteId) {
  if (confirm("¿Está seguro que desea eliminar este cliente?")) {
    fetch(`/api/clientes/delete/${clienteId}`, {
      method: "POST",
    })
      .then((response) => {
        if (response.ok) {
          window.location.reload() // Reload to show flash message
        } else {
          return response.text().then((text) => {
            throw new Error(text || "Error al eliminar cliente")
          })
        }
      })
      .catch((error) => {
        console.error("Error:", error)
        displayFlashMessage("Error al eliminar el cliente. Es posible que tenga despachos asociados.", "error")
      })
  }
}

// Load Trucks Table
function loadCamionesTable() {
  const table = document.getElementById("camiones-table")
  if (!table) return

  const tbody = table.querySelector("tbody")

  fetch("/api/camiones")
    .then((response) => response.json())
    .then((data) => {
      tbody.innerHTML = ""
      data.forEach((camion) => {
        const row = document.createElement("tr")
        row.innerHTML = `
              <td>${camion.marca}</td>
              <td>${camion.modelo}</td>
              <td>${camion.placa}</td>
              <td>${camion.capacidad} M3</td>
              <td>${camion.estado || "Activo"}</td>
              <td>
                  <button class="action-btn edit" data-id="${camion.id}" title="Editar"><i class="fas fa-edit"></i></button>
                  <button class="action-btn delete" data-id="${camion.id}" title="Eliminar"><i class="fas fa-trash"></i></button>
              </td>
          `
        tbody.appendChild(row)
      })
      setupCamionesActions()
    })
    .catch((error) => {
      console.error("Error al cargar camiones:", error)
      tbody.innerHTML = `<tr><td colspan="6" class="error-message">Error al cargar datos de camiones</td></tr>`
    })
}

// Setup Truck Actions
function setupCamionesActions() {
  const editButtons = document.querySelectorAll("#camiones-table .action-btn.edit")
  editButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const camionId = this.getAttribute("data-id")
      editCamion(camionId)
    })
  })

  const deleteButtons = document.querySelectorAll("#camiones-table .action-btn.delete")
  deleteButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const camionId = this.getAttribute("data-id")
      deleteCamion(camionId)
    })
  })
}

// Edit Truck
function editCamion(camionId) {
  fetch(`/api/camiones/${camionId}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Error al obtener datos del camión")
      }
      return response.json()
    })
    .then((camion) => {
      document.getElementById("camion_id_edit").value = camion.id
      document.getElementById("marca_camion_edit").value = camion.marca
      document.getElementById("modelo_camion_edit").value = camion.modelo
      document.getElementById("placa_camion_edit").value = camion.placa
      document.getElementById("capacidad_camion_edit").value = camion.capacidad

      const estadoSelect = document.getElementById("estado_camion_edit")
      if (estadoSelect) {
        estadoSelect.value = camion.estado || "Activo"
      }

      document.getElementById("form-title-camion").textContent = "Editar Camión"
      document.getElementById("camion-form").action = `/api/camiones/${camion.id}`
      document.getElementById("camion-form-modal").style.display = "block"
    })
    .catch((error) => {
      console.error("Error al obtener datos del camión:", error)
      displayFlashMessage("No se pudo cargar la información del camión. Por favor, intente nuevamente.", "error")
    })
}

// Delete Truck
function deleteCamion(camionId) {
  if (confirm("¿Está seguro que desea eliminar este camión?")) {
    fetch(`/api/camiones/delete/${camionId}`, {
      method: "POST",
    })
      .then((response) => {
        if (response.ok) {
          window.location.reload()
        } else {
          return response.text().then((text) => {
            throw new Error(text || "Error al eliminar camión")
          })
        }
      })
      .catch((error) => {
        console.error("Error:", error)
        displayFlashMessage("Error al eliminar el camión. Es posible que tenga mantenimientos asociados.", "error")
      })
  }
}

// Load Drivers Table
function loadChoferesTable() {
  const table = document.getElementById("choferes-table")
  if (!table) return

  const tbody = table.querySelector("tbody")

  fetch("/api/choferes")
    .then((response) => response.json())
    .then((data) => {
      tbody.innerHTML = ""
      data.forEach((chofer) => {
        const row = document.createElement("tr")
        row.innerHTML = `
              <td>${chofer.nombre}</td>
              <td>${chofer.cedula}</td>
              <td>${chofer.licencia}</td>
              <td>${formatDate(chofer.vencimiento_licencia)}</td>
              <td>${chofer.certificado_medico || "N/A"}</td>
              <td>${chofer.vencimiento_certificado ? formatDate(chofer.vencimiento_certificado) : "N/A"}</td>
              <td>
                  <button class="action-btn edit" data-id="${chofer.id}" title="Editar"><i class="fas fa-edit"></i></button>
                  <button class="action-btn delete" data-id="${chofer.id}" title="Eliminar"><i class="fas fa-trash"></i></button>
              </td>
          `
        tbody.appendChild(row)
      })
      setupChoferesActions()
    })
    .catch((error) => console.error("Error al cargar choferes:", error))
}

// Setup Driver Actions
function setupChoferesActions() {
  const editButtons = document.querySelectorAll("#choferes-table .action-btn.edit")
  editButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const choferId = this.getAttribute("data-id")
      editChofer(choferId)
    })
  })

  const deleteButtons = document.querySelectorAll("#choferes-table .action-btn.delete")
  deleteButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const choferId = this.getAttribute("data-id")
      deleteChofer(choferId)
    })
  })
}

// Edit Driver
function editChofer(choferId) {
  fetch(`/api/choferes/${choferId}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Error al obtener datos del chofer: ${response.status}`)
      }
      return response.json()
    })
    .then((chofer) => {
      document.getElementById("chofer_id_edit").value = chofer.id
      document.getElementById("nombre_chofer_edit").value = chofer.nombre

      // Correctly parse and set the document type and number
      let choferDocumentoType = "V" // Default to V
      let choferDocumentoNumber = ""
      if (chofer.cedula) {
        const parts = chofer.cedula.split("-")
        if (parts.length === 2) {
          choferDocumentoType = parts[0]
          choferDocumentoNumber = parts[1]
        } else {
          choferDocumentoNumber = chofer.cedula // Fallback if format is unexpected (e.g., old data without prefix)
        }
      }
      document.getElementById("documento_chofer_edit_type").value = choferDocumentoType
      document.getElementById("documento_chofer_edit_number").value = choferDocumentoNumber

      document.getElementById("licencia_chofer_edit").value = chofer.licencia

      if (chofer.vencimiento_licencia) {
        document.getElementById("vencimiento_licencia_chofer_edit").value = formatDateForInput(
          chofer.vencimiento_licencia,
        )
      }
      document.getElementById("certificado_medico_chofer_edit").value = chofer.certificado_medico || ""
      if (chofer.vencimiento_certificado) {
        document.getElementById("vencimiento_certificado_chofer_edit").value = formatDateForInput(
          chofer.vencimiento_certificado,
        )
      }

      document.getElementById("form-title-chofer").textContent = "Editar Chofer"
      document.getElementById("chofer-form").action = `/api/choferes/${chofer.id}`
      document.getElementById("chofer-form-modal").style.display = "block"
    })
    .catch((error) => {
      console.error("Error al obtener datos del chofer:", error)
      displayFlashMessage("No se pudo cargar la información del chofer. Por favor, intente nuevamente.", "error")
    })
}

// Delete Driver
function deleteChofer(choferId) {
  if (confirm("¿Está seguro que desea eliminar este chofer?")) {
    fetch(`/api/choferes/delete/${choferId}`, {
      method: "POST",
    })
      .then((response) => {
        if (response.ok) {
          window.location.reload()
        } else {
          return response.text().then((text) => {
            throw new Error(text || "Error al eliminar chofer")
          })
        }
      })
      .catch((error) => {
        console.error("Error:", error)
        displayFlashMessage("Error al eliminar el chofer. Es posible que tenga despachos asociados.", "error")
      })
  }
}

// Load Sellers Table
function loadVendedoresTable() {
  const table = document.getElementById("vendedores-table")
  if (!table) return

  const tbody = table.querySelector("tbody")

  fetch("/api/vendedores")
    .then((response) => response.json())
    .then((data) => {
      tbody.innerHTML = ""
      data.forEach((vendedor) => {
        const row = document.createElement("tr")
        row.innerHTML = `
              <td>${vendedor.nombre}</td>
              <td>${vendedor.cedula}</td>
              <td>${vendedor.telefono || "N/A"}</td>
              <td>${vendedor.direccion || "N/A"}</td>
              <td>${vendedor.correo || "N/A"}</td>
              <td>
                  <button class="action-btn edit" data-id="${vendedor.id}" title="Editar"><i class="fas fa-edit"></i></button>
                  <button class="action-btn delete" data-id="${vendedor.id}" title="Eliminar"><i class="fas fa-trash"></i></button>
              </td>
          `
        tbody.appendChild(row)
      })
      setupVendedoresActions()
    })
    .catch((error) => {
      console.error("Error al cargar vendedores:", error)
      tbody.innerHTML = `<tr><td colspan="7" class="error-message">Error al cargar datos de vendedores</td></tr>`
    })
}

// Setup Seller Actions
function setupVendedoresActions() {
  const userRole = sessionStorage.getItem("userRole")
  const editButtons = document.querySelectorAll("#vendedores-table .action-btn.edit")
  const deleteButtons = document.querySelectorAll("#vendedores-table .action-btn.delete")

  editButtons.forEach((button) => {
    if (userRole === "registro") {
      button.style.display = "none" // Hide for 'registro' role
    } else {
      button.style.display = "" // Show for other roles
      button.addEventListener("click", function () {
        const vendedorId = this.getAttribute("data-id")
        editVendedor(vendedorId)
      })
    }
  })

  deleteButtons.forEach((button) => {
    if (userRole === "registro") {
      button.style.display = "none" // Hide for 'registro' role
    } else {
      button.style.display = "" // Show for other roles
      button.addEventListener("click", function () {
        const vendedorId = this.getAttribute("data-id")
        deleteVendedor(vendedorId)
      })
    }
  })
}

// Edit Seller
function editVendedor(vendedorId) {
  fetch(`/api/vendedores/${vendedorId}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Error al obtener datos del vendedor: ${response.status}`)
      }
      return response.json()
    })
    .then((vendedor) => {
      document.getElementById("vendedor_id_edit").value = vendedor.id
      document.getElementById("nombre_vendedor_edit").value = vendedor.nombre
      document.getElementById("apellido_vendedor_edit").value = vendedor.apellido || "" // Ensure this line is present and correct
      document.getElementById("telefono_vendedor_edit").value = vendedor.telefono || ""
      document.getElementById("direccion_vendedor_edit").value = vendedor.direccion || ""
      document.getElementById("correo_vendedor_edit").value = vendedor.correo || ""

      // Correctly parse and set the document type and number
      let vendedorDocumentoType = "V" // Default to V
      let vendedorDocumentoNumber = ""
      if (vendedor.cedula) {
        const parts = vendedor.cedula.split("-")
        if (parts.length === 2) {
          vendedorDocumentoType = parts[0]
          vendedorDocumentoNumber = parts[1]
        } else {
          vendedorDocumentoNumber = vendedor.cedula // Fallback if format is unexpected
        }
      }
      document.getElementById("documento_vendedor_edit_type").value = vendedorDocumentoType
      document.getElementById("documento_vendedor_edit_number").value = vendedorDocumentoNumber

      document.getElementById("form-title-vendedor").textContent = "Editar Vendedor"
      document.getElementById("vendedor-form").action = `/api/vendedores/${vendedor.id}`
      document.getElementById("vendedor-form-modal").style.display = "block"
    })
    .catch((error) => {
      console.error("Error al obtener datos del vendedor:", error)
      displayFlashMessage("No se pudo cargar la información del vendedor. Por favor, intente nuevamente.", "error")
    })
}

// Delete Seller
function deleteVendedor(vendedorId) {
  if (confirm("¿Está seguro que desea eliminar este vendedor?")) {
    fetch(`/api/vendedores/delete/${vendedorId}`, {
      method: "POST",
    })
      .then((response) => {
        if (response.ok) {
          window.location.reload()
        } else {
          return response.text().then((text) => {
            throw new Error(text || "Error al eliminar vendedor")
          })
        }
      })
      .catch((error) => {
        console.error("Error:", error)
        displayFlashMessage("Error al eliminar el vendedor. Es posible que tenga clientes asociados.", "error")
      })
  }
}

// Load Maintenance Table
function loadMantenimientoTable() {
  const table = document.getElementById("mantenimiento-table")
  if (!table) return

  const tbody = table.querySelector("tbody")

  fetch("/api/mantenimiento")
    .then((response) => response.json())
    .then((data) => {
      tbody.innerHTML = ""
      data.forEach((mantenimiento) => {
        const row = document.createElement("tr")
        row.innerHTML = `
                  <td>${mantenimiento.placa} - ${mantenimiento.modelo}</td>
                  <td>${formatDate(mantenimiento.fecha)}</td>
                  <td>${mantenimiento.tipo_mantenimiento || "N/A"}</td>
                  <td>${mantenimiento.kilometraje_actual || "N/A"} km</td>
                  <td>${mantenimiento.proximo_kilometraje_mantenimiento ? `${mantenimiento.proximo_kilometraje_mantenimiento} km` : "N/A"}</td>
                  <td>${mantenimiento.proxima_fecha_mantenimiento ? formatDate(mantenimiento.proxima_fecha_mantenimiento) : "N/A"}</td>
                  <td>${mantenimiento.descripcion}</td>
                  <td>${formatCurrency(mantenimiento.costo)}</td>
                  <td>
                      <button class="action-btn edit" data-id="${mantenimiento.id}" title="Editar"><i class="fas fa-edit"></i></button>
                      <button class="action-btn delete" data-id="${mantenimiento.id}" title="Eliminar"><i class="fas fa-trash"></i></button>
                  </td>
              `
        tbody.appendChild(row)
      })
      setupMantenimientoActions() // NEW: Setup actions for maintenance table
    })
    .catch((error) => console.error("Error al cargar mantenimientos:", error))
}

// NEW: Setup Maintenance Actions
function setupMantenimientoActions() {
  const editButtons = document.querySelectorAll("#mantenimiento-table .action-btn.edit")
  editButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const mantenimientoId = this.getAttribute("data-id")
      editMantenimiento(mantenimientoId)
    })
  })

  const deleteButtons = document.querySelectorAll("#mantenimiento-table .action-btn.delete")
  deleteButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const mantenimientoId = this.getAttribute("data-id")
      deleteMantenimiento(mantenimientoId)
    })
  })
}

// Edit Maintenance
function editMantenimiento(mantenimientoId) {
  fetch(`/api/mantenimiento/${mantenimientoId}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`)
      }
      return response.json()
    })
    .then((data) => {
      const mantenimiento = data
      document.getElementById("mantenimiento_id_edit").value = mantenimiento.id
      document.getElementById("camion_mantenimiento_edit").value = mantenimiento.camion_id
      document.getElementById("fecha_mantenimiento_edit").value = formatDateForInput(mantenimiento.fecha)
      document.getElementById("tipo_mantenimiento_edit").value = mantenimiento.tipo_mantenimiento || ""
      document.getElementById("kilometraje_actual_edit").value = mantenimiento.kilometraje_actual || ""
      document.getElementById("proximo_kilometraje_mantenimiento_edit").value =
        mantenimiento.proximo_kilometraje_mantenimiento || ""
      document.getElementById("proxima_fecha_mantenimiento_edit").value =
        formatDateForInput(mantenimiento.proxima_fecha_mantenimiento) || ""
      document.getElementById("descripcion_mantenimiento_edit").value = mantenimiento.descripcion || ""
      document.getElementById("costo_mantenimiento_edit").value = mantenimiento.costo || ""

      document.getElementById("form-title-mantenimiento").textContent = "Editar Mantenimiento"
      document.getElementById("mantenimiento-form").action = `/api/mantenimiento/${mantenimiento.id}`
      document.getElementById("mantenimiento-form-modal").style.display = "block"
    })
    .catch((error) => {
      console.error("Error al cargar la información del mantenimiento:", error)
      displayFlashMessage(`Error al cargar la información del mantenimiento: ${error.message}`, "error")
    })
}

// Delete Maintenance
function deleteMantenimiento(mantenimientoId) {
  if (confirm("¿Está seguro que desea eliminar este registro de mantenimiento?")) {
    fetch(`/api/mantenimiento/delete/${mantenimientoId}`, {
      method: "POST",
    })
      .then((response) => {
        if (response.ok) {
          window.location.reload()
        } else {
          return response.text().then((text) => {
            throw new Error(text || "Error al eliminar mantenimiento")
          })
        }
      })
      .catch((error) => {
        console.error("Error:", error)
        displayFlashMessage(`Error al eliminar el mantenimiento: ${error.message}`, "error")
      })
  }

// Setup Modals
function setupModals() {
  // Client Modal
  const clienteModal = document.getElementById("cliente-form-modal")
  if (clienteModal) {
    const closeBtnCliente = clienteModal.querySelector(".close")
    if (closeBtnCliente) {
      closeBtnCliente.addEventListener("click", () => {
        clienteModal.style.display = "none"
      })
    }
  }

  // Truck Modal
  const camionModal = document.getElementById("camion-form-modal")
  if (camionModal) {
    const closeBtnCamion = camionModal.querySelector(".close")
    if (closeBtnCamion) {
      closeBtnCamion.addEventListener("click", () => {
        camionModal.style.display = "none"
      })
    }
  }

  // Driver Modal
  const choferModal = document.getElementById("chofer-form-modal")
  if (choferModal) {
    const closeBtnChofer = choferModal.querySelector(".close")
    if (closeBtnChofer) {
      closeBtnChofer.addEventListener("click", () => {
        choferModal.style.display = "none"
      })
    }
  }

  // Seller Modal
  const vendedorModal = document.getElementById("vendedor-form-modal")
  if (vendedorModal) {
    const closeBtnVendedor = vendedorModal.querySelector(".close")
    if (closeBtnVendedor) {
      closeBtnVendedor.addEventListener("click", () => {
        vendedorModal.style.display = "none"
      })
    }
  }

  // NEW: Supplier Modal
  const proveedorModal = document.getElementById("proveedor-form-modal")
  if (proveedorModal) {
    const closeBtnProveedor = proveedorModal.querySelector(".close")
    if (closeBtnProveedor) {
      closeBtnProveedor.addEventListener("click", () => {
        proveedorModal.style.display = "none"
      })
    }
  }

  // NEW: Maintenance Modal
  const mantenimientoModal = document.getElementById("mantenimiento-form-modal")
  if (mantenimientoModal) {
    const closeBtnMantenimiento = mantenimientoModal.querySelector(".close")
    if (closeBtnMantenimiento) {
      closeBtnMantenimiento.addEventListener("click", () => {
        mantenimientoModal.style.display = "none"
      })
    }
  }

  // Close modals when clicking outside
  window.addEventListener("click", (event) => {
    if (clienteModal && event.target === clienteModal) {
      clienteModal.style.display = "none"
    }
    if (camionModal && event.target === camionModal) {
      camionModal.style.display = "none"
    }
    if (choferModal && event.target === choferModal) {
      choferModal.style.display = "none"
    }
    if (vendedorModal && event.target === vendedorModal) {
      vendedorModal.style.display = "none"
    }
    if (proveedorModal && event.target === proveedorModal) {
      proveedorModal.style.display = "none"
    }
    if (mantenimientoModal && event.target === mantenimientoModal) {
      mantenimientoModal.style.display = "none"
    }
  })
}

// Setup Main Client Form
function setupMainClienteForm() {
  const mainForm = document.querySelector('#clientes form[action="/api/clientes"]')
  if (!mainForm) return

  mainForm.addEventListener("submit", (e) => {
    e.preventDefault()

    const nombreElement = document.getElementById("nombre_cliente")
    const telefonoElement = document.getElementById("telefono_cliente")
    const documentoTypeElement = document.getElementById("documento_cliente_type")
    const documentoNumberElement = document.getElementById("documento_cliente_number")
    const direccionElement = document.getElementById("direccion_cliente")
    const vendedorElement = document.getElementById("vendedor_cliente")
    const documentoErrorSpan = document.getElementById("documento_cliente_error")

    // Clear previous error
    documentoErrorSpan.style.display = "none"
    documentoErrorSpan.textContent = ""

    if (!nombreElement || !telefonoElement || !documentoTypeElement || !documentoNumberElement || !direccionElement) {
      displayFlashMessage("Error: No se pudieron encontrar todos los campos del formulario", "error")
      return
    }

    const nombre = nombreElement.value.trim()
    const telefono = telefonoElement.value.trim()
    const documentoType = documentoTypeElement.value
    const documentoNumber = documentoNumberElement.value.trim()
    const direccion = direccionElement.value.trim()
    const vendedorId = vendedorElement.value

    if (!nombre || !telefono || !documentoType || !documentoNumber || !direccion) {
      displayFlashMessage("Todos los campos son obligatorios", "error")
      return
    }

    if (!/^\d+$/.test(telefono)) {
      displayFlashMessage("El teléfono debe contener solo números", "error")
      return
    }

    // Client-side validation for Cédula
    if (!validateVenezuelanDocument(documentoType, documentoNumber, false, "documento_cliente_error")) {
      return // Validation failed, error message already displayed by validateVenezuelanDocument
    }

    const formData = new FormData()
    formData.append("nombre", nombre)
    formData.append("direccion", direccion)
    formData.append("telefono", telefono)
    formData.append("documento_type", documentoType)
    formData.append("documento_number", documentoNumber)
    formData.append("vendedor", vendedorId)
    fetch(mainForm.action, {
      method: "POST",
      body: formData,
    })
      .then((response) => {
        if (response.ok) {
          return response.text()
        } else {
          return response.text().then((text) => {
            throw new Error(text || "Error al guardar cliente")
          })
        }
      })
      .then((text) => {
        window.location.reload()
      })
      .catch((error) => {
        console.error("Error:", error)
        displayFlashMessage(`Error al guardar el cliente: ${error.message}`, "error")
      })
  })
}

// Setup Main Truck Form
function setupMainCamionForm() {
  const mainForm = document.querySelector('#camiones form[action="/api/camiones"]')
  if (!mainForm) return

  mainForm.addEventListener("submit", (e) => {
    e.preventDefault()

    const marcaElement = document.getElementById("marca_camion") // Corrected ID
    const modeloElement = document.getElementById("modelo_camion") // Corrected ID
    const placaElement = document.getElementById("placa_camion") // Corrected ID
    const capacidadElement = document.getElementById("capacidad_camion") // Corrected ID
    const estadoElement = document.getElementById("estado_camion") // Corrected ID
    const placaErrorSpan = document.getElementById("placa_camion_error")
    placaErrorSpan.style.display = "none"
    placaErrorSpan.textContent = ""

    if (!marcaElement || !modeloElement || !placaElement || !capacidadElement || !estadoElement) {
      displayFlashMessage("Error: No se pudieron encontrar todos los campos del formulario", "error")
      return
    }

    const marca = marcaElement.value.trim()
    const modelo = modeloElement.value.trim()
    const placa = placaElement.value.trim()
    const capacidad = capacidadElement.value.trim()
    const estado = estadoElement.value

    if (!marca || !modelo || !placa || !capacidad || !estado) {
      displayFlashMessage("Todos los campos son obligatorios", "error")
      return
    }

    if (!validateVenezuelanPlate(placa, "placa_camion_error")) {
      return
    }

    const formData = new FormData()
    formData.append("marca", marca)
    formData.append("modelo", modelo)
    formData.append("placa", placa)
    formData.append("capacidad", capacidad)
    formData.append("estado", estado)

    fetch(mainForm.action, {
      method: "POST",
      body: formData,
    })
      .then((response) => {
        if (response.ok) {
          return response.text()
        } else {
          return response.text().then((text) => {
            throw new Error(text || "Error al guardar camión")
          })
        }
      })
      .then((text) => {
        window.location.reload()
      })
      .catch((error) => {
        console.error("Error:", error)
        displayFlashMessage(`Error al guardar el camión: ${error.message}`, "error")
      })
  })
}

// Setup Main Seller Form (Removed for 'Registro' role)
/*
function setupMainVendedorForm() {
const mainForm = document.querySelector('#vendedores form[action="/api/vendedores"]')
if (!mainForm) return

mainForm.addEventListener("submit", (e) => {
  e.preventDefault()

  const nombreElement = document.getElementById("nombre_vendedor")
  const apellidoElement = document.getElementById("apellido_vendedor")
  const telefonoElement = document.getElementById("telefono_vendedor")
  const direccionElement = document.getElementById("direccion_vendedor")
  const correoElement = document.getElementById("correo_vendedor")
  const documentoTypeElement = document.getElementById("documento_vendedor_type")
  const documentoNumberElement = document.getElementById("documento_vendedor_number")
  const documentoErrorSpan = document.getElementById("documento_vendedor_error") // Get the error span

  if (
    !nombreElement ||
    !apellidoElement ||
    !documentoTypeElement ||
    !documentoNumberElement ||
    !telefonoElement ||
    !direccionElement ||
    !correoElement
  ) {
    displayFlashMessage("Error: No se pudieron encontrar todos los campos del formulario", "error")
    return
  }

  const nombre = nombreElement.value.trim()
  const apellido = apellidoElement.value.trim()
  const telefono = telefonoElement.value.trim()
  const direccion = direccionElement.value.trim()
  const correo = correoElement.value.trim()
  const documentoType = documentoTypeElement.value
  const documentoNumber = documentoNumberElement.value.trim()

  // Clear previous error
  documentoErrorSpan.style.display = "none"
  documentoErrorSpan.textContent = ""

  if (!nombre || !apellido || !documentoType || !documentoNumber || !telefono || !direccion || !correo) {
    displayFlashMessage("Todos los campos son obligatorios", "error")
    return
  }

  // Add client-side validation for document
  if (!validateVenezuelanDocument(documentoType, documentoNumber, false, "documento_vendedor_error")) {
    return // Validation failed, error message already displayed
  }

  const formData = new FormData()
  formData.append("nombre", nombre)
  formData.append("apellido", apellido)
  formData.append("telefono", telefono)
  formData.append("direccion", direccion)
  formData.append("correo", correo)
  formData.append("documento_type", documentoType)
  formData.append("documento_number", documentoNumber)

  fetch(mainForm.action, {
    method: "POST",
    body: formData,
  })
    .then((response) => {
      if (response.ok) {
        return response.text()
      } else {
        return response.text().then((text) => {
          throw new Error(text || "Error al guardar vendedor")
        })
      }
    })
    .then((text) => {
      window.location.reload()
    })
    .catch((error) => {
      console.error("Error:", error)
      displayFlashMessage(`Error al guardar el vendedor: ${error.message}`, "error")
    })
})
}
*/

// Setup Main Driver Form
function setupMainChoferForm() {
  const mainForm = document.querySelector('#choferes form[action="/api/choferes"]')
  if (!mainForm) return

  mainForm.addEventListener("submit", (e) => {
    e.preventDefault()

    const nombreElement = document.getElementById("nombre_chofer")
    const documentoTypeElement = document.getElementById("documento_chofer_type")
    const documentoNumberElement = document.getElementById("documento_chofer_number")
    const licenciaElement = document.getElementById("licencia_chofer") // Corrected ID
    const vencimientoLicenciaElement = document.getElementById("vencimiento_licencia_chofer") // Corrected ID
    const certificadoMedicoElement = document.getElementById("certificado_medico_chofer") // Corrected ID
    const vencimientoCertificadoElement = document.getElementById("vencimiento_certificado_chofer") // Corrected ID
    const documentoErrorSpan = document.getElementById("documento_chofer_error")

    if (
      !nombreElement ||
      !documentoTypeElement ||
      !documentoNumberElement ||
      !licenciaElement ||
      !vencimientoLicenciaElement
    ) {
      displayFlashMessage("Error: No se pudieron encontrar todos los campos del formulario", "error")
      return
    }

    const nombre = nombreElement.value.trim()
    const documentoType = documentoTypeElement.value
    const documentoNumber = documentoNumberElement.value.trim()
    const licencia = licenciaElement.value.trim()
    const vencimientoLicencia = vencimientoLicenciaElement.value
    const certificadoMedico = certificadoMedicoElement.value.trim()
    const vencimientoCertificado = vencimientoCertificadoElement.value

    if (!nombre || !documentoType || !documentoNumber || !licencia || !vencimientoLicencia) {
      displayFlashMessage("Los campos nombre, documento, licencia y vencimiento de licencia son obligatorios", "error")
      return
    }

    // Add client-side validation for document
    if (!validateVenezuelanDocument(documentoType, documentoNumber, false, "documento_chofer_error")) {
      return // Validation failed, error message already displayed
    }

    const formData = new FormData()
    formData.append("nombre", nombre)
    formData.append("documento_type", documentoType)
    formData.append("documento_number", documentoNumber)
    formData.append("licencia", licencia)
    formData.append("vencimientoLicencia", vencimientoLicencia)
    formData.append("certificadoMedico", certificadoMedico)
    formData.append("vencimientoCertificado", vencimientoCertificado)

    fetch(mainForm.action, {
      method: "POST",
      body: formData,
    })
      .then((response) => {
        if (response.ok) {
          return response.text()
        } else {
          return response.text().then((text) => {
            throw new Error(text || "Error al guardar chofer")
          })
        }
      })
      .then((text) => {
        window.location.reload()
      })
      .catch((error) => {
        console.error("Error:", error)
        displayFlashMessage(`Error al guardar el chofer: ${error.message}`, "error")
      })
  })
}

// NEW: Setup Main Supplier Form
function setupMainProveedorForm() {
  const mainForm = document.getElementById("main-proveedor-form")
  const materialesContainer = document.getElementById("materiales-container")
  const addMaterialBtn = document.getElementById("add-material-btn")

  if (!mainForm) return

  // Add initial material row
  if (materialesContainer.children.length === 0) {
    addMaterialRow(materialesContainer)
  }

  addMaterialBtn.addEventListener("click", () => addMaterialRow(materialesContainer))

  mainForm.addEventListener("submit", async (e) => {
    e.preventDefault()

    const nombre = document.getElementById("nombre_proveedor").value.trim()
    const rifTypeElement = document.getElementById("rif_proveedor_type")
    const rifNumberElement = document.getElementById("rif_proveedor_number")
    const direccion = document.getElementById("direccion_proveedor").value.trim()
    const telefono = document.getElementById("telefono_proveedor").value.trim()
    const email = document.getElementById("email_proveedor").value.trim()
    const nombreContacto = document.getElementById("nombre_contacto_proveedor").value.trim() // NEW
    const telefonoContacto = document.getElementById("telefono_contacto_proveedor").value.trim() // NEW
    const rifErrorSpan = document.getElementById("rif_proveedor_error")

    // Clear previous error
    rifErrorSpan.style.display = "none"
    rifErrorSpan.textContent = ""

    if (!nombre || !rifTypeElement.value || !rifNumberElement.value) {
      displayFlashMessage("El nombre y el RIF del proveedor son obligatorios.", "error")
      return
    }

    const rifType = rifTypeElement.value
    const rifNumber = rifNumberElement.value.trim()

    // Client-side validation for RIF
    if (!validateVenezuelanDocument(rifType, rifNumber, true, "rif_proveedor_error")) {
      return // Validation failed, error message already displayed by validateVenezuelanDocument
    }

    const materiales = []
    let allMaterialsValid = true
    materialesContainer.querySelectorAll(".material-row").forEach((row) => {
      const nombreMaterial = row.querySelector(".nombre-material").value.trim()
      const precioMaterial = Number.parseFloat(row.querySelector(".precio-material").value)
      const unidadMedida = row.querySelector(".unidad-medida-material").value

      if (!nombreMaterial || isNaN(precioMaterial) || precioMaterial <= 0 || !unidadMedida) {
        allMaterialsValid = false
        displayFlashMessage(
          "Todos los campos de material (nombre, precio, unidad) son obligatorios y el precio debe ser mayor a 0.",
          "error",
        )
        return
      }
      materiales.push({
        nombre_material: nombreMaterial,
        precio: precioMaterial,
        unidad_medida: unidadMedida,
      })
    })

    if (!allMaterialsValid) {
      return
    }
    if (materiales.length === 0) {
      displayFlashMessage("Debe añadir al menos un material que el proveedor ofrece.", "error")
      return
    }

    const formData = new FormData()
    formData.append("nombre", nombre)
    formData.append("rif_type", rifType)
    formData.append("rif_number", rifNumber)
    formData.append("direccion", direccion)
    formData.append("telefono", telefono)
    formData.append("email", email)
    formData.append("nombre_contacto", nombreContacto) // NEW
    formData.append("telefono_contacto", telefonoContacto) // NEW
    formData.append("materiales", JSON.stringify(materiales))

    try {
      const response = await fetch(mainForm.action, {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        displayFlashMessage(data.message, "success")
        window.location.reload()
      } else {
        displayFlashMessage(data.message || "Error al guardar proveedor", "error")
      }
    } catch (error) {
      console.error("Error:", error)
      displayFlashMessage(`Error de red o al procesar la respuesta: ${error.message}`, "error")
    }
  })
}

// NEW: Setup Main Maintenance Form
function setupMainMantenimientoForm() {
  const mainForm = document.querySelector('#mantenimiento form[action="/api/mantenimiento"]')
  if (!mainForm) return

  const camionSelect = document.getElementById("camion_mantenimiento")
  const kilometrajeActualInput = document.getElementById("kilometraje_actual")

  // Event listener to populate kilometraje_actual when a truck is selected
  if (camionSelect && kilometrajeActualInput) {
    camionSelect.addEventListener("change", async () => {
      const selectedOption = camionSelect.options[camionSelect.selectedIndex]
      const camionId = selectedOption.value
      if (camionId) {
        try {
          const response = await fetch(`/api/camiones/${camionId}/odometer`)
          if (response.ok) {
            const data = await response.json()
            kilometrajeActualInput.value = data.current_odometer || 0
          } else {
            console.error("Error fetching odometer:", response.statusText)
            kilometrajeActualInput.value = 0
          }
        } catch (error) {
          console.error("Fetch error for odometer:", error)
          kilometrajeActualInput.value = 0
        }
      } else {
        kilometrajeActualInput.value = ""
      }
    })
  }

  mainForm.addEventListener("submit", (e) => {
    e.preventDefault()

    const camionId = document.getElementById("camion_mantenimiento").value
    const fecha = document.getElementById("fecha_mantenimiento").value
    const tipoMantenimiento = document.getElementById("tipo_mantenimiento").value
    const kilometrajeActual = document.getElementById("kilometraje_actual").value
    const descripcion = document.getElementById("descripcion_mantenimiento").value
    const costo = document.getElementById("costo_mantenimiento").value

    if (!camionId || !fecha || !tipoMantenimiento || !kilometrajeActual || !descripcion || !costo) {
      displayFlashMessage("Todos los campos son obligatorios", "error")
      return
    }

    const formData = new FormData()
    formData.append("camion_id", camionId)
    formData.append("fecha", fecha)
    formData.append("tipo_mantenimiento", tipoMantenimiento)
    formData.append("kilometraje_actual", kilometrajeActual)
    formData.append("descripcion", descripcion)
    formData.append("costo", costo)

    fetch(mainForm.action, {
      method: "POST",
      body: formData,
    })
      .then((response) => {
        if (response.ok) {
          return response.text()
        } else {
          return response.text().then((text) => {
            throw new Error(text || "Error al guardar mantenimiento")
          })
        }
      })
      .then((text) => {
        window.location.reload()
      })
      .catch((error) => {
        console.error("Error:", error)
        displayFlashMessage(`Error al guardar el mantenimiento: ${error.message}`, "error")
      })
  })
}

// Setup Edit Client Form
function setupClientesForm() {
  const form = document.getElementById("cliente-form")
  if (!form) return

  form.addEventListener("submit", (e) => {
    e.preventDefault()

    const nombreElement = document.getElementById("nombre_cliente_edit")
    const telefonoElement = document.getElementById("telefono_cliente_edit") // Corrected ID
    const documentoTypeElement = document.getElementById("documento_cliente_edit_type")
    const documentoNumberElement = document.getElementById("documento_cliente_edit_number")
    const direccionElement = document.getElementById("direccion_cliente_edit") // Corrected ID
    const vendedorElement = document.getElementById("vendedor_cliente_edit")
    const documentoErrorSpan = document.getElementById("documento_cliente_edit_error")

    // Clear previous error
    documentoErrorSpan.style.display = "none"
    documentoErrorSpan.textContent = ""

    if (!nombreElement || !telefonoElement || !documentoTypeElement || !documentoNumberElement || !direccionElement) {
      displayFlashMessage("Error: No se pudieron encontrar todos los campos del formulario", "error")
      return
    }

    const nombre = nombreElement.value.trim()
    const telefono = telefonoElement.value.trim()
    const documentoType = documentoTypeElement.value
    const documentoNumber = documentoNumberElement.value.trim()
    const direccion = direccionElement.value.trim()
    const vendedorId = vendedorElement.value

    if (!nombre || !telefono || !documentoType || !documentoNumber || !direccion) {
      displayFlashMessage("Todos los campos son obligatorios", "error")
      return
    }

    if (!/^\d+$/.test(telefono)) {
      displayFlashMessage("El teléfono debe contener solo números", "error")
      return
    }

    // Client-side validation for Cédula
    if (!validateVenezuelanDocument(documentoType, documentoNumber, false, "documento_cliente_edit_error")) {
      return // Validation failed, error message already displayed by validateVenezuelanDocument
    }

    const formData = new FormData()
    formData.append("nombre", nombre)
    formData.append("direccion", direccion)
    formData.append("telefono", telefono)
    formData.append("documento_type", documentoType)
    formData.append("documento_number", documentoNumber)
    formData.append("vendedor", vendedorId)

    fetch(form.action, {
      method: "POST",
      body: formData,
    })
      .then((response) => {
        if (response.ok) {
          return response.text()
        } else {
          return response.text().then((text) => {
            throw new Error(text || "Error al actualizar cliente")
          })
        }
      })
      .then((text) => {
        window.location.reload()
      })
      .catch((error) => {
        console.error("Error:", error)
        displayFlashMessage(`Error al actualizar el cliente: ${error.message}`, "error")
      })
  })
}

// Setup Edit Truck Form
function setupCamionesForm() {
  const form = document.getElementById("camion-form")
  if (!form) return

  form.addEventListener("submit", (e) => {
    e.preventDefault()

    const marcaElement = document.getElementById("marca_camion_edit")
    const modeloElement = document.getElementById("modelo_camion_edit")
    const placaElement = document.getElementById("placa_camion_edit")
    const capacidadElement = document.getElementById("capacidad_camion_edit")
    const estadoElement = document.getElementById("estado_camion_edit")
    const placaErrorSpan = document.getElementById("placa_camion_edit_error")
    placaErrorSpan.style.display = "none"
    placaErrorSpan.textContent = ""

    if (!marcaElement || !modeloElement || !placaElement || !capacidadElement || !estadoElement) {
      displayFlashMessage("Error: No se pudieron encontrar todos los campos del formulario", "error")
      return
    }

    const marca = marcaElement.value.trim()
    const modelo = modeloElement.value.trim()
    const placa = placaElement.value.trim()
    const capacidad = capacidadElement.value.trim()
    const estado = estadoElement.value

    if (!marca || !modelo || !placa || !capacidad || !estado) {
      displayFlashMessage("Todos los campos son obligatorios", "error")
      return
    }

    if (!validateVenezuelanPlate(placa, "placa_camion_edit_error")) {
      return
    }

    const formData = new FormData()
    formData.append("marca", marca)
    formData.append("modelo", modelo)
    formData.append("placa", placa)
    formData.append("capacidad", capacidad)
    formData.append("estado", estado)

    fetch(form.action, {
      method: "POST",
      body: formData,
    })
      .then((response) => {
        if (response.ok) {
          return response.text()
        } else {
          return response.text().then((text) => {
            throw new Error(text || "Error al actualizar camión")
          })
        }
      })
      .then((text) => {
        window.location.reload()
      })
      .catch((error) => {
        console.error("Error:", error)
        displayFlashMessage(`Error al actualizar el camión: ${error.message}`, "error")
      })
  })
}

// Setup Edit Driver Form
function setupChoferesForm() {
  const form = document.getElementById("chofer-form")
  if (!form) return

  form.addEventListener("submit", (e) => {
    e.preventDefault()

    const nombreElement = document.getElementById("nombre_chofer_edit")
    const documentoTypeElement = document.getElementById("documento_chofer_edit_type")
    const documentoNumberElement = document.getElementById("documento_chofer_edit_number")
    const licenciaElement = document.getElementById("licencia_chofer_edit")
    const vencimientoLicenciaElement = document.getElementById("vencimiento_licencia_chofer_edit")
    const certificadoMedicoElement = document.getElementById("certificado_medico_chofer_edit")
    const vencimientoCertificadoElement = document.getElementById("vencimiento_certificado_chofer_edit")
    const documentoErrorSpan = document.getElementById("documento_chofer_edit_error")

    if (
      !nombreElement ||
      !documentoTypeElement ||
      !documentoNumberElement ||
      !licenciaElement ||
      !vencimientoLicenciaElement
    ) {
      displayFlashMessage("Error: No se pudieron encontrar todos los campos del formulario", "error")
      return
    }

    const nombre = nombreElement.value.trim()
    const documentoType = documentoTypeElement.value
    const documentoNumber = documentoNumberElement.value.trim()
    const licencia = licenciaElement.value.trim()
    const vencimientoLicencia = vencimientoLicenciaElement.value
    const certificadoMedico = certificadoMedicoElement.value.trim()
    const vencimientoCertificado = vencimientoCertificadoElement.value

    if (!nombre || !documentoType || !documentoNumber || !licencia || !vencimientoLicencia) {
      displayFlashMessage("Los campos nombre, documento, licencia y vencimiento de licencia son obligatorios", "error")
      return
    }

    // Add client-side validation for document
    if (!validateVenezuelanDocument(documentoType, documentoNumber, false, "documento_chofer_edit_error")) {
      return // Validation failed, error message already displayed
    }

    const formData = new FormData()
    formData.append("nombre", nombre)
    formData.append("documento_type", documentoType)
    formData.append("documento_number", documentoNumber)
    formData.append("licencia", licencia)
    formData.append("vencimientoLicencia", vencimientoLicencia)
    formData.append("certificadoMedico", certificadoMedico)
    formData.append("vencimientoCertificado", vencimientoCertificado)

    fetch(form.action, {
      method: "POST",
      body: formData,
    })
      .then((response) => {
        if (response.ok) {
          return response.text()
        } else {
          return response.text().then((text) => {
            throw new Error(text || "Error al actualizar chofer")
          })
        }
      })
      .then((text) => {
        window.location.reload()
      })
      .catch((error) => {
        console.error("Error:", error)
        displayFlashMessage(`Error al actualizar el chofer: ${error.message}`, "error")
      })
  })
}

// Setup Edit Seller Form
function setupVendedoresForm() {
  const form = document.getElementById("vendedor-form")
  if (!form) return

  form.addEventListener("submit", (e) => {
    e.preventDefault()

    const nombreElement = document.getElementById("nombre_vendedor_edit")
    const apellidoElement = document.getElementById("apellido_vendedor_edit")
    const telefonoElement = document.getElementById("telefono_vendedor_edit")
    const direccionElement = document.getElementById("direccion_vendedor_edit")
    const correoElement = document.getElementById("correo_vendedor_edit")
    const documentoTypeElement = document.getElementById("documento_vendedor_edit_type")
    const documentoNumberElement = document.getElementById("documento_vendedor_edit_number")
    const documentoErrorSpan = document.getElementById("documento_vendedor_edit_error")

    if (
      !nombreElement ||
      !apellidoElement ||
      !documentoTypeElement ||
      !documentoNumberElement ||
      !telefonoElement ||
      !direccionElement ||
      !correoElement
    ) {
      displayFlashMessage("Error: No se pudieron encontrar todos los campos del formulario", "error")
      return
    }

    const nombre = nombreElement.value.trim()
    const apellido = apellidoElement.value.trim()
    const telefono = telefonoElement.value.trim()
    const direccion = direccionElement.value.trim()
    const correo = correoElement.value.trim()
    const documentoType = documentoTypeElement.value
    const documentoNumber = documentoNumberElement.value.trim()

    // Clear previous error
    documentoErrorSpan.style.display = "none"
    documentoErrorSpan.textContent = ""

    if (!nombre || !apellido || !documentoType || !documentoNumber || !telefono || !direccion || !correo) {
      displayFlashMessage("Todos los campos son obligatorios", "error")
      return
    }

    // Add client-side validation for document
    if (!validateVenezuelanDocument(documentoType, documentoNumber, false, "documento_vendedor_edit_error")) {
      return // Validation failed, error message already displayed
    }

    const formData = new FormData()
    formData.append("nombre", nombre)
    formData.append("apellido", apellido)
    formData.append("telefono", telefono)
    formData.append("direccion", direccion)
    formData.append("correo", correo)
    formData.append("documento_type", documentoType)
    formData.append("documento_number", documentoNumber)

    fetch(form.action, {
      method: "POST",
      body: formData,
    })
      .then((response) => {
        if (response.ok) {
          return response.text()
        } else {
          return response.text().then((text) => {
            throw new Error(text || "Error al actualizar vendedor")
          })
        }
      })
      .then((text) => {
        window.location.reload()
      })
      .catch((error) => {
        console.error("Error:", error)
        displayFlashMessage(`Error al actualizar el vendedor: ${error.message}`, "error")
      })
  })
}

// NEW: Setup Edit Supplier Form
function setupProveedoresForm() {
  const form = document.getElementById("proveedor-form")
  const materialesEditContainer = document.getElementById("materiales-edit-container")
  const addMaterialEditBtn = document.getElementById("add-material-edit-btn")

  if (!form) return

  addMaterialEditBtn.addEventListener("click", () => addMaterialRow(materialesEditContainer))

  form.addEventListener("submit", async (e) => {
    e.preventDefault()

    const nombre = document.getElementById("nombre_proveedor_edit").value.trim()
    const rifTypeElement = document.getElementById("rif_proveedor_edit_type")
    const rifNumberElement = document.getElementById("rif_proveedor_edit_number")
    const direccion = document.getElementById("direccion_proveedor_edit").value.trim()
    const telefono = document.getElementById("telefono_proveedor_edit").value.trim()
    const email = document.getElementById("email_proveedor_edit").value.trim()
    const nombreContacto = document.getElementById("nombre_contacto_proveedor_edit").value.trim() // NEW
    const telefonoContacto = document.getElementById("telefono_contacto_proveedor_edit").value.trim() // NEW
    const rifErrorSpan = document.getElementById("rif_proveedor_edit_error")

    // Clear previous error
    rifErrorSpan.style.display = "none"
    rifErrorSpan.textContent = ""

    if (!nombre || !rifTypeElement.value || !rifNumberElement.value) {
      displayFlashMessage("El nombre y el RIF del proveedor son obligatorios.", "error")
      return
    }

    const rifType = rifTypeElement.value
    const rifNumber = rifNumberElement.value.trim()

    // Client-side validation for RIF
    if (!validateVenezuelanDocument(rifType, rifNumber, true, "rif_proveedor_edit_error")) {
      return // Validation failed, error message already displayed by validateVenezuelanDocument
    }

    const materiales = []
    let allMaterialsValid = true
    materialesEditContainer.querySelectorAll(".material-row").forEach((row) => {
      const nombreMaterial = row.querySelector(".nombre-material").value.trim()
      const precioMaterial = Number.parseFloat(row.querySelector(".precio-material").value)
      const unidadMedida = row.querySelector(".unidad-medida-material").value

      if (!nombreMaterial || isNaN(precioMaterial) || precioMaterial <= 0 || !unidadMedida) {
        allMaterialsValid = false
        displayFlashMessage(
          "Todos los campos de material (nombre, precio, unidad) son obligatorios y el precio debe ser mayor a 0.",
          "error",
        )
        return
      }
      materiales.push({
        nombre_material: nombreMaterial,
        precio: precioMaterial,
        unidad_medida: unidadMedida,
      })
    })

    if (!allMaterialsValid) {
      return
    }
    if (materiales.length === 0) {
      displayFlashMessage("Debe añadir al menos un material que el proveedor ofrece.", "error")
      return
    }

    const formData = new FormData()
    formData.append("nombre", nombre)
    formData.append("rif_type", rifType)
    formData.append("rif_number", rifNumber)
    formData.append("direccion", direccion)
    formData.append("telefono", telefono)
    formData.append("email", email)
    formData.append("nombre_contacto", nombreContacto) // NEW
    formData.append("telefono_contacto", telefonoContacto) // NEW
    formData.append("materiales", JSON.stringify(materiales))

    try {
      const response = await fetch(form.action, {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        displayFlashMessage(data.message, "success")
        window.location.reload()
      } else {
        displayFlashMessage(data.message || "Error al actualizar proveedor", "error")
      }
    } catch (error) {
      console.error("Error:", error)
      displayFlashMessage(`Error de red o al procesar la respuesta: ${error.message}`, "error")
    }
  })
}

// NEW: Setup Edit Maintenance Form
function setupMantenimientoForm() {
  const form = document.getElementById("mantenimiento-form")
  if (!form) return

  const camionSelect = document.getElementById("camion_mantenimiento_edit")
  const kilometrajeActualInput = document.getElementById("kilometraje_actual_edit")
  const proximoKilometrajeInput = document.getElementById("proximo_kilometraje_mantenimiento_edit")
  const proximaFechaInput = document.getElementById("proxima_fecha_mantenimiento_edit")
  const tipoMantenimientoSelect = document.getElementById("tipo_mantenimiento_edit")
  const fechaMantenimientoInput = document.getElementById("fecha_mantenimiento_edit")

  // Event listener to populate kilometraje_actual when a truck is selected in edit modal
  if (camionSelect && kilometrajeActualInput) {
    camionSelect.addEventListener("change", async () => {
      const selectedOption = camionSelect.options[camionSelect.selectedIndex]
      const camionId = selectedOption.value
      if (camionId) {
        try {
          const response = await fetch(`/api/camiones/${camionId}/odometer`)
          if (response.ok) {
            const data = await response.json()
            kilometrajeActualInput.value = data.current_odometer || 0
          } else {
            console.error("Error fetching odometer for edit:", response.statusText)
            kilometrajeActualInput.value = 0
          }
        } catch (error) {
          console.error("Fetch error for odometer in edit:", error)
          kilometrajeActualInput.value = 0
        }
      } else {
        kilometrajeActualInput.value = ""
      }
    })
  }

  // Event listener to recalculate next maintenance dates/km when type or date changes
  const recalculateNextMaintenance = () => {
    const tipo = tipoMantenimientoSelect.value
    const fechaStr = fechaMantenimientoInput.value
    const kmActual = Number.parseInt(kilometrajeActualInput.value, 10)

    if (tipo && fechaStr && !isNaN(kmActual)) {
      const fecha = new Date(fechaStr + "T00:00:00") // Ensure UTC to avoid timezone issues
      let proximoKm = ""
      let proximaFecha = ""

      const intervalos = {
        "Cambio de Aceite": { km: 10000, months: 6 },
        "Revisión General": { km: 50000, months: 12 },
        Frenos: { km: 30000, months: null },
        Neumáticos: { km: 20000, months: null },
        "Inspección de Fluidos": { km: 15000, months: 3 },
        "Reemplazo de Filtros": { km: 25000, months: 9 },
      }

      const intervalo = intervalos[tipo]
      if (intervalo) {
        if (intervalo.km) {
          proximoKm = kmActual + intervalo.km
        }
        if (intervalo.months) {
          const futureDate = new Date(fecha)
          futureDate.setMonth(futureDate.getMonth() + intervalo.months)
          proximaFecha = formatDateForInput(futureDate)
        }
      }
      proximoKilometrajeInput.value = proximoKm
      proximaFechaInput.value = proximaFecha
    } else {
      proximoKilometrajeInput.value = ""
      proximaFechaInput.value = ""
    }
  }

  if (tipoMantenimientoSelect && fechaMantenimientoInput && kilometrajeActualInput) {
    tipoMantenimientoSelect.addEventListener("change", recalculateNextMaintenance)
    fechaMantenimientoInput.addEventListener("change", recalculateNextMaintenance)
    kilometrajeActualInput.addEventListener("input", recalculateNextMaintenance)
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault()

    const camionId = document.getElementById("camion_mantenimiento_edit").value
    const fecha = document.getElementById("fecha_mantenimiento_edit").value
    const tipoMantenimiento = document.getElementById("tipo_mantenimiento_edit").value
    const kilometrajeActual = document.getElementById("kilometraje_actual_edit").value
    const descripcion = document.getElementById("descripcion_mantenimiento_edit").value
    const costo = document.getElementById("costo_mantenimiento_edit").value

    if (!camionId || !fecha || !tipoMantenimiento || !kilometrajeActual || !descripcion || !costo) {
      displayFlashMessage("Todos los campos son obligatorios", "error")
      return
    }

    const formData = new FormData()
    formData.append("camion_id", camionId)
    formData.append("fecha", fecha)
    formData.append("tipo_mantenimiento", tipoMantenimiento)
    formData.append("kilometraje_actual", kilometrajeActual)
    formData.append("descripcion", descripcion)
    formData.append("costo", costo)

    fetch(form.action, {
      method: "POST",
      body: formData,
    })
      .then((response) => {
        if (response.ok) {
          return response.text()
        } else {
          return response.text().then((text) => {
            throw new Error(text || "Error al actualizar mantenimiento")
          })
        }
      })
      .then((text) => {
        window.location.reload()
      })
      .catch((error) => {
        console.error("Error:", error)
        displayFlashMessage(`Error al actualizar el mantenimiento: ${error.message}`, "error")
      })
  })
}

// NEW: Load Suppliers Table
function loadProveedoresTable() {
  const table = document.getElementById("proveedores-table")
  if (!table) return

  const tbody = table.querySelector("tbody")

  fetch("/api/proveedores")
    .then((response) => response.json())
    .then((data) => {
      tbody.innerHTML = ""
      data.forEach((proveedor) => {
        const materialesList = proveedor.materiales
          .map((m) => `${m.nombre_material} (${m.precio} ${m.unidad_medida})`)
          .join(", ")
        const row = document.createElement("tr")
        row.innerHTML = `
              <td>${proveedor.nombre}</td>
              <td>${proveedor.rif}</td>
              <td>${proveedor.direccion || "N/A"}</td>
              <td>${proveedor.telefono || "N/A"}</td>
              <td>${proveedor.email || "N/A"}</td>
              <td>${proveedor.nombre_contacto || "N/A"}</td>
              <td>${proveedor.telefono_contacto || "N/A"}</td>
              <td>${materialesList || "N/A"}</td>
              <td>
                  <button class="action-btn edit" data-id="${proveedor.id}" title="Editar"><i class="fas fa-edit"></i></button>
                  <button class="action-btn delete" data-id="${proveedor.id}" title="Eliminar"><i class="fas fa-trash"></i></button>
              </td>
          `
        tbody.appendChild(row)
      })
      setupProveedoresActions()
    })
    .catch((error) => {
      console.error("Error al cargar proveedores:", error)
      tbody.innerHTML = `<tr><td colspan="9" class="error-message">Error al cargar datos de proveedores</td></tr>`
    })
}

// NEW: Setup Supplier Actions
function setupProveedoresActions() {
  const editButtons = document.querySelectorAll("#proveedores-table .action-btn.edit")
  editButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const proveedorId = this.getAttribute("data-id")
      editProveedor(proveedorId)
    })
  })

  const deleteButtons = document.querySelectorAll("#proveedores-table .action-btn.delete")
  deleteButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const proveedorId = this.getAttribute("data-id")
      deleteProveedor(proveedorId)
    })
  })
}

// NEW: Edit Supplier
function editProveedor(proveedorId) {
  fetch(`/api/proveedores/${proveedorId}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Error al obtener datos del proveedor: ${response.status}`)
      }
      return response.json()
    })
    .then((proveedor) => {
      document.getElementById("proveedor_id_edit").value = proveedor.id
      document.getElementById("nombre_proveedor_edit").value = proveedor.nombre || ""

      let rifType = "J"
      let rifNumber = ""
      if (proveedor.rif) {
        const parts = proveedor.rif.split("-")
        if (parts.length === 2) {
          rifType = parts[0]
          rifNumber = parts[1]
        } else {
          rifNumber = proveedor.rif // Fallback
        }
      }
      document.getElementById("rif_proveedor_edit_type").value = rifType
      document.getElementById("rif_proveedor_edit_number").value = rifNumber

      document.getElementById("direccion_proveedor_edit").value = proveedor.direccion || ""
      document.getElementById("telefono_proveedor_edit").value = proveedor.telefono || ""
      document.getElementById("email_proveedor_edit").value = proveedor.email || ""
      document.getElementById("nombre_contacto_proveedor_edit").value = proveedor.nombre_contacto || "" // NEW
      document.getElementById("telefono_contacto_proveedor_edit").value = proveedor.telefono_contacto || "" // NEW

      // Clear existing materials and add new ones from data
      const materialesEditContainer = document.getElementById("materiales-edit-container")
      materialesEditContainer.innerHTML = ""
      if (proveedor.materiales && proveedor.materiales.length > 0) {
        proveedor.materiales.forEach((material) => {
          addMaterialRow(materialesEditContainer, material)
        })
      } else {
        addMaterialRow(materialesEditContainer) // Add an empty row if no materials
      }

      document.getElementById("form-title-proveedor").textContent = "Editar Proveedor"
      document.getElementById("proveedor-form").action = `/api/proveedores/${proveedor.id}`
      document.getElementById("proveedor-form-modal").style.display = "block"
    })
    .catch((error) => {
      console.error("Error al obtener datos del proveedor:", error)
      displayFlashMessage("No se pudo cargar la información del proveedor. Por favor, intente nuevamente.", "error")
    })
}

// NEW: Delete Supplier
function deleteProveedor(proveedorId) {
  if (confirm("¿Está seguro que desea eliminar este proveedor?")) {
    fetch(`/api/proveedores/delete/${proveedorId}`, {
      method: "POST",
    })
      .then((response) => {
        if (response.ok) {
          window.location.reload()
        } else {
          return response.text().then((text) => {
            throw new Error(text || "Error al eliminar proveedor")
          })
        }
      })
      .catch((error) => {
        console.error("Error:", error)
        displayFlashMessage(
          "Error al eliminar el proveedor. Es posible que tenga órdenes de compra asociadas.",
          "error",
        )
      })
  }
}

// Helper function to add a material row to the form
function addMaterialRow(container, material = {}) {
  const materialRow = document.createElement("div")
  materialRow.classList.add("material-row")
  materialRow.innerHTML = `
      <input type="text" class="nombre-material" placeholder="Nombre Material" value="${material.nombre_material || ""}" required>
      <input type="number" step="0.01" class="precio-material" placeholder="Precio" value="${material.precio || ""}" required>
      <select class="unidad-medida-material" required>
          <option value="">Unidad</option>
          <option value="kg" ${material.unidad_medida === "kg" ? "selected" : ""}>kg</option>
          <option value="litros" ${material.unidad_medida === "litros" ? "selected" : ""}>litros</option>
          <option value="m3" ${material.unidad_medida === "m3" ? "selected" : ""}>m³</option>
          <option value="unidades" ${material.unidad_medida === "unidades" ? "selected" : ""}>unidades</option>
      </select>
      <button type="button" class="remove-material-btn btn-danger">X</button>
  `
  container.appendChild(materialRow)

  // Add event listener for remove button
  materialRow.querySelector(".remove-material-btn").addEventListener("click", () => {
    materialRow.remove()
    if (container.children.length === 0) {
      addMaterialRow(container) // Ensure at least one row remains
    }
  })
}

// Helper function to format date for display
function formatDate(dateString) {
  if (!dateString) return "N/A"
  const date = new Date(dateString + "T00:00:00") // Add T00:00:00 to treat as UTC and avoid timezone issues
  return date.toLocaleDateString("es-ES", { year: "numeric", month: "2-digit", day: "2-digit" })
}

// Helper function to format date for input type="date"
function formatDateForInput(dateString) {
  if (!dateString) return ""
  const date = new Date(dateString + "T00:00:00")
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, "0")
  const day = date.getDate().toString().padStart(2, "0")
  return `${year}-${month}-${day}`
}

// Helper function to format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: "VES",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Helper function to display flash messages
function displayFlashMessage(message, category) {
  const flashMessagesDiv = document.getElementById("flash-messages")
  if (flashMessagesDiv) {
    const ul = flashMessagesDiv.querySelector(".flash-messages-list") || document.createElement("ul")
    ul.classList.add("flash-messages-list")
    flashMessagesDiv.appendChild(ul)

    const li = document.createElement("li")
    li.classList.add("alert", `alert-${category}`)
    li.textContent = message
    ul.appendChild(li)

    // Automatically remove message after 5 seconds
    setTimeout(() => {
      li.remove()
      if (ul.children.length === 0) {
        ul.remove()
      }
    }, 5000)
  } else {
    alert(message) // Fallback if flash message div not found
  }
}

// Client-side validation for Venezuelan license plates (LNNLLNL)
function validateVenezuelanPlate(plate, errorElementId) {
  const errorSpan = document.getElementById(errorElementId)
  const plateRegex = /^[A-Z]{1}\d{2}[A-Z]{2}\d{1}[A-Z]{1}$/i // LDDLLDL

  if (!plate) {
    errorSpan.textContent = "La placa no puede estar vacía."
    errorSpan.style.display = "block"
    return false
  }

  if (!plateRegex.test(plate)) {
    errorSpan.textContent = "Formato de placa inválido. Debe ser LDDLLDL (ej. A12BC3D)."
    errorSpan.style.display = "block"
    return false
  }

  errorSpan.style.display = "none"
  errorSpan.textContent = ""
  return true
}

// Client-side validation for Venezuelan documents (Cédula/RIF)
function validateVenezuelanDocument(type, number, isRif = false, errorElementId) {
  const errorSpan = document.getElementById(errorElementId)
  errorSpan.style.display = "none"
  errorSpan.textContent = ""

  if (!type || !number) {
    errorSpan.textContent = "El tipo y número de documento no pueden estar vacíos."
    errorSpan.style.display = "block"
    return false
  }

  const fullDocument = `${type}-${number}`

  if (isRif) {
    // RIF validation: [J|V|G|E|P]-d{8}-d
    const rifRegex = /^([JVGEP])-(\d{8})-(\d)$/i
    const match = rifRegex.exec(fullDocument.toUpperCase())

    if (!match) {
      errorSpan.textContent = "Formato de RIF inválido. Debe ser [J|V|G|E|P]-XXXXXXXX-X."
      errorSpan.style.display = "block"
      return false
    }

    const prefix = match[1]
    const bodyStr = match[2]
    const checkDigit = Number.parseInt(match[3], 10)

    const bodyDigits = bodyStr.split("").map(Number)
    const weights = [3, 2, 7, 6, 5, 4, 3, 2]
    let weightedSum = 0
    for (let i = 0; i < 8; i++) {
      weightedSum += bodyDigits[i] * weights[i]
    }

    const prefixValue = { J: 8, G: 9, V: 1, E: 2, P: 3 }[prefix] || 0
    const totalSum = weightedSum + prefixValue
    const remainder = totalSum % 11

    let expectedCheckDigit = 0
    if (remainder === 0) {
      expectedCheckDigit = 0
    } else if (remainder === 1) {
      expectedCheckDigit = prefix === "V" || prefix === "E" ? 0 : 9
    } else {
      expectedCheckDigit = 11 - remainder
    }

    if (expectedCheckDigit !== checkDigit) {
      errorSpan.textContent = `Dígito verificador del RIF incorrecto. Se esperaba ${expectedCheckDigit}.`
      errorSpan.style.display = "block"
      return false
    }
  } else {
    // Cédula validation: [V|E|J|G]-d{7,8} (simplified, only format and length)
    // Note: Backend has more specific validation for V/E vs J/G for RIF.
    // For Cédula, we'll keep it simpler as per common client-side practice.
    const cedulaRegex = /^([VEJG])-(\d{6,9})$/i // Allow 6-9 digits for flexibility
    if (!cedulaRegex.test(fullDocument.toUpperCase())) {
      errorSpan.textContent = "Formato de cédula inválido. Debe ser [V|E|J|G]-XXXXXXX o [V|E|J|G]-XXXXXXXX."
      errorSpan.style.display = "block"
      return false
    }
  }

  return true
}

document.addEventListener("DOMContentLoaded", () => {
  loadDespachosTable()
  loadClientesTableFn()
  loadVendedoresTableFn()
  loadCamionesTableFn()
  loadChoferesTableFn()
  loadDespachoFormOptions()

  // Form submissions
  document.getElementById("despachoForm").addEventListener("submit", handleFormSubmit)
  document.getElementById("clienteForm").addEventListener("submit", handleFormSubmit)
  document.getElementById("vendedorForm").addEventListener("submit", handleFormSubmit)
  document.getElementById("camionForm").addEventListener("submit", handleFormSubmit)
  document.getElementById("choferForm").addEventListener("submit", handleFormSubmit)
})

function openModal(modalId, isEdit = false) {
  const modal = document.getElementById(modalId)
  modal.style.display = "block"
  if (!isEdit) {
    // Clear form fields when opening for new entry
    const form = modal.querySelector("form")
    form.reset()
    // Reset hidden ID field
    const idField = form.querySelector('input[type="hidden"][name="id"]')
    if (idField) {
      idField.value = ""
    }
    // For specific forms, reset selects or other complex fields if needed
    if (modalId === "clienteModal") {
      document.getElementById("clienteDocumentoType").value = "V"
    } else if (modalId === "vendedorModal") {
      document.getElementById("vendedorDocumentoType").value = "V"
    } else if (modalId === "choferModal") {
      document.getElementById("choferDocumentoType").value = "V"
    }
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId)
  modal.style.display = "none"
}

async function handleFormSubmit(event) {
  event.preventDefault()
  const form = event.target
  const formData = new FormData(form)
  const id = formData.get("id")
  let url = ""
  const method = "POST"
  let successMessage = ""
  let errorMessage = ""
  let refreshTable = null

  if (form.id === "despachoForm") {
    url = id ? `/api/despachos/${id}` : "/api/despachos"
    successMessage = id ? "Despacho actualizado exitosamente" : "Despacho registrado exitosamente"
    errorMessage = id ? "Error al actualizar despacho" : "Error al registrar despacho"
    refreshTable = loadDespachosTable
  } else if (form.id === "clienteForm") {
    url = id ? `/api/clientes/${id}` : "/api/clientes"
    successMessage = id ? "Cliente actualizado exitosamente" : "Cliente registrado exitosamente"
    errorMessage = id ? "Error al actualizar cliente" : "Error al registrar cliente"
    refreshTable = loadClientesTableFn
  } else if (form.id === "vendedorForm") {
    url = id ? `/api/vendedores/${id}` : "/api/vendedores"
    successMessage = id ? "Vendedor actualizado exitosamente" : "Vendedor registrado exitosamente"
    errorMessage = id ? "Error al actualizar vendedor" : "Error al registrar vendedor"
    refreshTable = loadVendedoresTableFn
  } else if (form.id === "camionForm") {
    url = id ? `/api/camiones/${id}` : "/api/camiones"
    successMessage = id ? "Camión actualizado exitosamente" : "Camión registrado exitosamente"
    errorMessage = id ? "Error al actualizar camión" : "Error al registrar camión"
    refreshTable = loadCamionesTableFn
  } else if (form.id === "choferForm") {
    url = id ? `/api/choferes/${id}` : "/api/choferes"
    successMessage = id ? "Chofer actualizado exitosamente" : "Chofer registrado exitosamente"
    errorMessage = id ? "Error al actualizar chofer" : "Error al registrar chofer"
    refreshTable = loadChoferesTableFn
  }

  try {
    const response = await fetch(url, {
      method: method,
      body: formData,
    })
    const data = await response.json()

    if (data.success) {
      alert(successMessage)
      closeModal(form.closest(".modal").id)
      if (refreshTable) refreshTable()
    } else {
      alert(errorMessage + ": " + data.message)
    }
  } catch (error) {
    console.error("Error:", error)
    alert("Error de conexión: " + error.message)
  }
}

async function loadDespachosTable() {
  const tableBody = document.querySelector("#despachosTable tbody")
  tableBody.innerHTML = '<tr><td colspan="13">Cargando despachos...</td></tr>'
  try {
    const response = await fetch("/api/despachos")
    const despachos = await response.json()
    tableBody.innerHTML = ""
    if (despachos.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="13">No hay despachos registrados.</td></tr>'
      return
    }
    despachos.forEach((despacho) => {
      const row = tableBody.insertRow()
      row.insertCell().textContent = despacho.guia
      row.insertCell().textContent = despacho.fecha
      row.insertCell().textContent = despacho.m3
      row.insertCell().textContent = despacho.resistencia // Assuming 'resistencia' is the design name
      row.insertCell().textContent = despacho.cliente_nombre
      row.insertCell().textContent = despacho.chofer_nombre
      row.insertCell().textContent = despacho.camion_placa
      row.insertCell().textContent = despacho.vendedor_nombre
      row.insertCell().textContent = despacho.status
      row.insertCell().textContent = despacho.hora_salida || "N/A"
      row.insertCell().textContent = despacho.hora_llegada || "N/A"
      row.insertCell().textContent = despacho.received_by || "N/A"

      const actionsCell = row.insertCell()
      const editButton = document.createElement("button")
      editButton.className = "btn btn-sm btn-edit"
      editButton.innerHTML = '<i class="fas fa-edit"></i>'
      editButton.onclick = () => editDespacho(despacho.id)
      actionsCell.appendChild(editButton)

      const deleteButton = document.createElement("button")
      deleteButton.className = "btn btn-sm btn-delete"
      deleteButton.innerHTML = '<i class="fas fa-trash"></i>'
      deleteButton.onclick = () => deleteDespacho(despacho.id)
      actionsCell.appendChild(deleteButton)
    })
  } catch (error) {
    console.error("Error al cargar despachos:", error)
    tableBody.innerHTML = '<tr><td colspan="13">Error al cargar despachos.</td></tr>'
  }
}

async function editDespacho(id) {
  try {
    const response = await fetch(`/api/despachos/${id}`)
    const despacho = await response.json()
    if (despacho.error) {
      alert("Error: " + despacho.error)
      return
    }

    document.getElementById("despachoId").value = despacho.id
    document.getElementById("despachoFecha").value = despacho.fecha
    document.getElementById("despachoM3").value = despacho.m3
    // Set selected design
    const disenoSelect = document.getElementById("despachoDiseno")
    // Assuming despacho.concrete_design_id holds the ID
    disenoSelect.value = despacho.concrete_design_id

    document.getElementById("despachoCliente").value = despacho.cliente_id
    document.getElementById("despachoChofer").value = despacho.chofer_id
    document.getElementById("despachoVendedor").value = despacho.vendedor_id
    document.getElementById("despachoCamion").value = despacho.camion_id

    openModal("despachoModal", true)
  } catch (error) {
    console.error("Error al obtener despacho para edición:", error)
    alert("Error al cargar datos del despacho.")
  }
}

async function deleteDespacho(id) {
  if (!confirm("¿Está seguro de que desea eliminar este despacho?")) {
    return
  }
  try {
    const response = await fetch(`/api/despachos/delete/${id}`, {
      method: "POST",
    })
    const data = await response.json()
    if (data.success) {
      alert("Despacho eliminado exitosamente")
      loadDespachosTable()
    } else {
      alert("Error al eliminar despacho: " + data.message)
    }
  } catch (error) {
    console.error("Error al eliminar despacho:", error)
    alert("Error de conexión al eliminar despacho.")
  }
}

async function loadClientesTableFn() {
  const tableBody = document.querySelector("#clientesTable tbody")
  tableBody.innerHTML = '<tr><td colspan="6">Cargando clientes...</td></tr>'
  try {
    const response = await fetch("/api/clientes")
    const clientes = await response.json()
    tableBody.innerHTML = ""
    if (clientes.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="6">No hay clientes registrados.</td></tr>'
      return
    }
    clientes.forEach((cliente) => {
      const row = tableBody.insertRow()
      row.insertCell().textContent = cliente.nombre
      row.insertCell().textContent = cliente.documento
      row.insertCell().textContent = cliente.telefono
      row.insertCell().textContent = cliente.direccion
      row.insertCell().textContent = cliente.vendedor_nombre || "N/A" // Display seller name

      const actionsCell = row.insertCell()
      const editButton = document.createElement("button")
      editButton.className = "btn btn-sm btn-edit"
      editButton.innerHTML = '<i class="fas fa-edit"></i>'
      editButton.onclick = () => editClienteFn(cliente.id)
      actionsCell.appendChild(editButton)

      const deleteButton = document.createElement("button")
      deleteButton.className = "btn btn-sm btn-delete"
      deleteButton.innerHTML = '<i class="fas fa-trash"></i>'
      deleteButton.onclick = () => deleteClienteFn(cliente.id)
      actionsCell.appendChild(deleteButton)
    })
  } catch (error) {
    console.error("Error al cargar clientes:", error)
    tableBody.innerHTML = '<tr><td colspan="6">Error al cargar clientes.</td></tr>'
  }
}

async function editClienteFn(id) {
  try {
    const response = await fetch(`/api/clientes/${id}`)
    const cliente = await response.json()
    if (cliente.error) {
      alert("Error: " + cliente.error)
      return
    }

    document.getElementById("clienteId").value = cliente.id
    document.getElementById("clienteNombre").value = cliente.nombre

    // Split document type and number
    const [docType, docNumber] = cliente.documento.split("-")
    document.getElementById("clienteDocumentoType").value = docType
    document.getElementById("clienteDocumentoNumber").value = docNumber

    document.getElementById("clienteTelefono").value = cliente.telefono
    document.getElementById("clienteDireccion").value = cliente.direccion
    document.getElementById("clienteVendedor").value = cliente.vendedor_id

    openModal("clienteModal", true)
  } catch (error) {
    console.error("Error al obtener cliente para edición:", error)
    alert("Error al cargar datos del cliente.")
  }
}

async function deleteClienteFn(id) {
  if (!confirm("¿Está seguro de que desea eliminar este cliente?")) {
    return
  }
  try {
    const response = await fetch(`/api/clientes/delete/${id}`, {
      method: "POST",
    })
    const data = await response.json()
    if (data.success) {
      alert("Cliente eliminado exitosamente")
      loadClientesTableFn()
    } else {
      alert("Error al eliminar cliente: " + data.message)
    }
  } catch (error) {
    console.error("Error al eliminar cliente:", error)
    alert("Error de conexión al eliminar cliente.")
  }
}

async function loadVendedoresTableFn() {
  const tableBody = document.querySelector("#vendedoresTable tbody")
  tableBody.innerHTML = '<tr><td colspan="6">Cargando vendedores...</td></tr>'
  try {
    const response = await fetch("/api/vendedores")
    const vendedores = await response.json()
    tableBody.innerHTML = ""
    if (vendedores.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="6">No hay vendedores registrados.</td></tr>'
      return
    }
    vendedores.forEach((vendedor) => {
      const row = tableBody.insertRow()
      row.insertCell().textContent = vendedor.nombre
      row.insertCell().textContent = vendedor.cedula
      row.insertCell().textContent = vendedor.telefono
      row.insertCell().textContent = vendedor.direccion
      row.insertCell().textContent = vendedor.correo

      const actionsCell = row.insertCell()
      const editButton = document.createElement("button")
      editButton.className = "btn btn-sm btn-edit"
      editButton.innerHTML = '<i class="fas fa-edit"></i>'
      editButton.onclick = () => editVendedorFn(vendedor.id)
      actionsCell.appendChild(editButton)

      const deleteButton = document.createElement("button")
      deleteButton.className = "btn btn-sm btn-delete"
      deleteButton.innerHTML = '<i class="fas fa-trash"></i>'
      deleteButton.onclick = () => deleteVendedorFn(vendedor.id)
      actionsCell.appendChild(deleteButton)
    })
  } catch (error) {
    console.error("Error al cargar vendedores:", error)
    tableBody.innerHTML = '<tr><td colspan="6">Error al cargar vendedores.</td></tr>'
  }
}

async function editVendedorFn(id) {
  try {
    const response = await fetch(`/api/vendedores/${id}`)
    const vendedor = await response.json()
    if (vendedor.error) {
      alert("Error: " + vendedor.error)
      return
    }

    document.getElementById("vendedorId").value = vendedor.id
    document.getElementById("vendedorNombre").value = vendedor.nombre

    // Split document type and number
    const [docType, docNumber] = vendedor.cedula.split("-")
    document.getElementById("vendedorDocumentoType").value = docType
    document.getElementById("vendedorDocumentoNumber").value = docNumber

    document.getElementById("vendedorTelefono").value = vendedor.telefono
    document.getElementById("vendedorDireccion").value = vendedor.direccion
    document.getElementById("vendedorCorreo").value = vendedor.correo

    openModal("vendedorModal", true)
  } catch (error) {
    console.error("Error al obtener vendedor para edición:", error)
    alert("Error al cargar datos del vendedor.")
  }
}

async function deleteVendedorFn(id) {
  if (!confirm("¿Está seguro de que desea eliminar este vendedor?")) {
    return
  }
  try {
    const response = await fetch(`/api/vendedores/delete/${id}`, {
      method: "POST",
    })
    const data = await response.json()
    if (data.success) {
      alert("Vendedor eliminado exitosamente")
      loadVendedoresTableFn()
    } else {
      alert("Error al eliminar vendedor: " + data.message)
    }
  } catch (error) {
    console.error("Error al eliminar vendedor:", error)
    alert("Error de conexión al eliminar vendedor.")
  }
}

async function loadCamionesTableFn() {
  const tableBody = document.querySelector("#camionesTable tbody")
  tableBody.innerHTML = '<tr><td colspan="7">Cargando camiones...</td></tr>'
  try {
    const response = await fetch("/api/camiones")
    const camiones = await response.json()
    tableBody.innerHTML = ""
    if (camiones.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="7">No hay camiones registrados.</td></tr>'
      return
    }
    camiones.forEach((camion) => {
      const row = tableBody.insertRow()
      row.insertCell().textContent = camion.marca
      row.insertCell().textContent = camion.modelo
      row.insertCell().textContent = camion.placa
      row.insertCell().textContent = camion.capacidad
      row.insertCell().textContent = camion.current_odometer // Display current odometer
      row.insertCell().textContent = camion.estado

      const actionsCell = row.insertCell()
      const editButton = document.createElement("button")
      editButton.className = "btn btn-sm btn-edit"
      editButton.innerHTML = '<i class="fas fa-edit"></i>'
      editButton.onclick = () => editCamionFn(camion.id)
      actionsCell.appendChild(editButton)

      const deleteButton = document.createElement("button")
      deleteButton.className = "btn btn-sm btn-delete"
      deleteButton.innerHTML = '<i class="fas fa-trash"></i>'
      deleteButton.onclick = () => deleteCamionFn(camion.id)
      actionsCell.appendChild(deleteButton)
    })
  } catch (error) {
    console.error("Error al cargar camiones:", error)
    tableBody.innerHTML = '<tr><td colspan="7">Error al cargar camiones.</td></tr>'
  }
}

async function editCamionFn(id) {
  try {
    const response = await fetch(`/api/camiones/${id}`)
    const camion = await response.json()
    if (camion.error) {
      alert("Error: " + camion.error)
      return
    }

    document.getElementById("camionId").value = camion.id
    document.getElementById("camionMarca").value = camion.marca
    document.getElementById("camionModelo").value = camion.modelo
    document.getElementById("camionPlaca").value = camion.placa
    document.getElementById("camionCapacidad").value = camion.capacidad
    document.getElementById("camionOdometer").value = camion.current_odometer // Set odometer
    document.getElementById("camionEstado").value = camion.estado

    openModal("camionModal", true)
  } catch (error) {
    console.error("Error al obtener camión para edición:", error)
    alert("Error al cargar datos del camión.")
  }
}

async function deleteCamionFn(id) {
  if (!confirm("¿Está seguro de que desea eliminar este camión?")) {
    return
  }
  try {
    const response = await fetch(`/api/camiones/delete/${id}`, {
      method: "POST",
    })
    const data = await response.json()
    if (data.success) {
      alert("Camión eliminado exitosamente")
      loadCamionesTableFn()
    } else {
      alert("Error al eliminar camión: " + data.message)
    }
  } catch (error) {
    console.error("Error al eliminar camión:", error)
    alert("Error de conexión al eliminar camión.")
  }
}

async function loadChoferesTableFn() {
  const tableBody = document.querySelector("#choferesTable tbody")
  tableBody.innerHTML = '<tr><td colspan="7">Cargando choferes...</td></tr>'
  try {
    const response = await fetch("/api/choferes")
    const choferes = await response.json()
    tableBody.innerHTML = ""
    if (choferes.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="7">No hay choferes registrados.</td></tr>'
      return
    }
    choferes.forEach((chofer) => {
      const row = tableBody.insertRow()
      row.insertCell().textContent = chofer.nombre
      row.insertCell().textContent = chofer.cedula
      row.insertCell().textContent = chofer.licencia
      row.insertCell().textContent = chofer.vencimiento_licencia || "N/A"
      row.insertCell().textContent = chofer.certificado_medico || "N/A"
      row.insertCell().textContent = chofer.vencimiento_certificado || "N/A"

      const actionsCell = row.insertCell()
      const editButton = document.createElement("button")
      editButton.className = "btn btn-sm btn-edit"
      editButton.innerHTML = '<i class="fas fa-edit"></i>'
      editButton.onclick = () => editChoferFn(chofer.id)
      actionsCell.appendChild(editButton)

      const deleteButton = document.createElement("button")
      deleteButton.className = "btn btn-sm btn-delete"
      deleteButton.innerHTML = '<i class="fas fa-trash"></i>'
      deleteButton.onclick = () => deleteChoferFn(chofer.id)
      actionsCell.appendChild(deleteButton)
    })
  } catch (error) {
    console.error("Error al cargar choferes:", error)
    tableBody.innerHTML = '<tr><td colspan="7">Error al cargar choferes.</td></tr>'
  }
}

async function editChoferFn(id) {
  try {
    const response = await fetch(`/api/choferes/${id}`)
    const chofer = await response.json()
    if (chofer.error) {
      alert("Error: " + chofer.error)
      return
    }

    document.getElementById("choferId").value = chofer.id
    document.getElementById("choferNombre").value = chofer.nombre

    // Split document type and number
    const [docType, docNumber] = chofer.cedula.split("-")
    document.getElementById("choferDocumentoType").value = docType
    document.getElementById("choferDocumentoNumber").value = docNumber

    document.getElementById("choferLicencia").value = chofer.licencia
    document.getElementById("choferVencimientoLicencia").value = chofer.vencimiento_licencia
    document.getElementById("choferCertificadoMedico").value = chofer.certificado_medico
    document.getElementById("choferVencimientoCertificado").value = chofer.vencimiento_certificado

    openModal("choferModal", true)
  } catch (error) {
    console.error("Error al obtener chofer para edición:", error)
    alert("Error al cargar datos del chofer.")
  }
}

async function deleteChoferFn(id) {
  if (!confirm("¿Está seguro de que desea eliminar este chofer?")) {
    return
  }
  try {
    const response = await fetch(`/api/choferes/delete/${id}`, {
      method: "POST",
    })
    const data = await response.json()
    if (data.success) {
      alert("Chofer eliminado exitosamente")
      loadChoferesTableFn()
    } else {
      alert("Error al eliminar chofer: " + data.message)
    }
  } catch (error) {
    console.error("Error al eliminar chofer:", error)
    alert("Error de conexión al eliminar chofer.")
  }
}

async function loadDespachoFormOptions() {
  try {
    // Load Designs
    const disenoSelect = document.getElementById("despachoDiseno")
    const designsResponse = await fetch("/api/disenos")
    const designs = await designsResponse.json()
    disenoSelect.innerHTML = '<option value="">Seleccione un Diseño</option>'
    designs.forEach((design) => {
      const option = document.createElement("option")
      option.value = design.id
      option.textContent = `${design.nombre} (${design.resistencia} - ${design.asentamiento})`
      if (!design.disponible) {
        option.disabled = true
        option.textContent += ` (Agotado - ${design.m3_disponibles} m³ disponibles)`
      } else if (design.m3_disponibles < 200) {
        // Assuming 200m3 is the minimum for "limitado"
        option.textContent += ` (Limitado - ${design.m3_disponibles} m³ disponibles)`
      }
      disenoSelect.appendChild(option)
    })

    // Load Clients
    const clienteSelect = document.getElementById("despachoCliente")
    const clientesResponse = await fetch("/api/clientes")
    const clientes = await clientesResponse.json()
    clienteSelect.innerHTML = '<option value="">Seleccione un Cliente</option>'
    clientes.forEach((cliente) => {
      const option = document.createElement("option")
      option.value = cliente.id
      option.textContent = cliente.nombre
      clienteSelect.appendChild(option)
    })

    // Load Drivers
    const choferSelect = document.getElementById("despachoChofer")
    const choferesResponse = await fetch("/api/choferes")
    const choferes = await choferesResponse.json()
    choferSelect.innerHTML = '<option value="">Seleccione un Chofer</option>'
    choferes.forEach((chofer) => {
      const option = document.createElement("option")
      option.value = chofer.id
      option.textContent = chofer.nombre
      choferSelect.appendChild(option)
    })

    // Load Sellers for Despacho Form
    const vendedorDespachoSelect = document.getElementById("despachoVendedor")
    const vendedoresResponse = await fetch("/api/vendedores")
    const vendedores = await vendedoresResponse.json()
    vendedorDespachoSelect.innerHTML = '<option value="">Seleccione un Vendedor</option>'
    vendedores.forEach((vendedor) => {
      const option = document.createElement("option")
      option.value = vendedor.id
      option.textContent = vendedor.nombre
      vendedorDespachoSelect.appendChild(option)
    })

    // Load Sellers for Cliente Form
    const clienteVendedorSelect = document.getElementById("clienteVendedor")
    clienteVendedorSelect.innerHTML = '<option value="">Seleccione un Vendedor</option>'
    vendedores.forEach((vendedor) => {
      const option = document.createElement("option")
      option.value = vendedor.id
      option.textContent = vendedor.nombre
      clienteVendedorSelect.appendChild(option)
    })

    // Load Trucks
    const camionSelect = document.getElementById("despachoCamion")
    const camionesResponse = await fetch("/api/camiones")
    const camiones = await camionesResponse.json()
    camionSelect.innerHTML = '<option value="">Seleccione un Camión</option>'
    camiones.forEach((camion) => {
      const option = document.createElement("option")
      option.value = camion.id
      option.textContent = `${camion.marca} ${camion.modelo} (${camion.placa})`
      camionSelect.appendChild(option)
    })
  } catch (error) {
    console.error("Error al cargar opciones del formulario de despacho:", error)
    alert("Error al cargar opciones para los formularios.")
  }
}
}