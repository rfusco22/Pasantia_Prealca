import re
from datetime import datetime, timedelta, date
import json
import os
import random
import string
from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify, send_from_directory
from flask_mail import Mail, Message
import pymysql
from werkzeug.utils import secure_filename
import threading # Import threading for asynchronous email sending

app = Flask(__name__, static_folder='static', template_folder='templates')

app.secret_key = "prealca_secret_key_2023"

# Configuración de la base de datos MySQL
db_host = "yamanote.proxy.rlwy.net"
db_user = "root"
db_password = "IntAxhBpIcxKbxDnXGEOGDuwoljAnvxF"
db_name = "railway"
db_port = 14899

# Configuración del correo
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'fuscoriccardo11@gmail.com'
app.config['MAIL_PASSWORD'] = 'fsqa yqdg dxgh smlo'
mail = Mail(app)

# Helper function to send email asynchronously
def send_async_email(app, msg):
    with app.app_context():
        mail.send(msg)

# Configuración para subida de archivos
UPLOAD_FOLDER = 'static/uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Mínimo fijo para todas las dosificaciones (200 m³)
MINIMO_DOSIFICACION_M3 = 200

# Definiciones de intervalos de mantenimiento preventivo
MANTENIMIENTO_INTERVALOS = {
'Cambio de Aceite': {'km': 10000, 'months': 6},
'Revisión General': {'km': 50000, 'months': 12},
'Frenos': {'km': 30000, 'months': None},
'Neumáticos': {'km': 20000, 'months': None},
'Inspección de Fluidos': {'km': 15000, 'months': 3},
'Reemplazo de Filtros': {'km': 25000, 'months': 9}
}

# Aditivos universales que se descuentan por cada m³ de concreto producido,
# independientemente del diseño específico.
UNIVERSAL_ADDITIVES_PER_M3 = {
'Fibra': 0.6,    # kg per m³ of concrete
'Hidrófugo': 0.6 # kg per m³ of concrete (CORREGIDO: 'Hydrofugo' a 'Hidrófugo')
}

# Función para conectar con la base de datos
def get_db_connection():
  return pymysql.connect(host=db_host,
                  user=db_user,
                  password=db_password,
                  db=db_name,
                  port=db_port,
                  cursorclass=pymysql.cursors.DictCursor)

# NEW: Helper function to get service details by ID
def get_service_by_id(service_id):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            sql = "SELECT code, description, unit_price FROM services WHERE id = %s"
            cursor.execute(sql, (service_id,))
            return cursor.fetchone()
    except Exception as e:
            print(f"Error getting service by ID {service_id}: {str(e)}")
            return None
    finally:
            connection.close()

# NEW: Helper function to get concrete design details by ID for internal use
def get_concrete_design_by_id_internal(design_id):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            sql_design = "SELECT id, code, nombre, resistencia, asentamiento FROM concrete_designs WHERE id = %s"
            cursor.execute(sql_design, (design_id,))
            return cursor.fetchone()
    except Exception as e:
        print(f"Error getting concrete design by ID internally {design_id}: {str(e)}")
        return None
    finally:
        connection.close()

# Función para verificar extensiones de archivo permitidas
def allowed_file(filename):
  return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB en bytes
# Función para validar el tamaño del archivo
def validate_file_size(file):
  if file:
      file.seek(0, os.SEEK_END)
      size = file.tell()
      file.seek(0)
      return size <= MAX_FILE_SIZE
  return True

# Función para validar nombre (solo letras, espacios, acentos, numeros y caracteres especiales como , . ( ) - ')
def validate_name(name):
  if not name or len(name.strip()) < 2:
      return False, "El nombre debe tener al menos 2 caracteres."
  
  if len(name.strip()) > 100:
      return False, "El nombre no puede exceder 100 caracteres."
  
  # Permitir letras, números, espacios, acentos, ñ, apóstrofes, guiones, puntos, comas y paréntesis
  name_pattern = re.compile(r"^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s'\-.,()]+$")
  if not name_pattern.match(name.strip()):
      return False, "El nombre solo puede contener letras, números, espacios, acentos y caracteres básicos (', -, ., ,, (, ))."
  
  return True, "Nombre válido."

# Función para validar teléfono venezolano
def validate_phone(phone):
  if not phone:
      return False, "El teléfono no puede estar vacío."
  
  # Limpiar el teléfono de espacios y caracteres especiales
  clean_phone = re.sub(r'[^\d]', '', phone)
  
  # Validar formato venezolano: debe tener 11 dígitos y empezar con 04 (móvil) o 02 (fijo)
  if len(clean_phone) == 11:
      if clean_phone.startswith('04') or clean_phone.startswith('02'):
          return True, "Teléfono válido."
      else:
          return False, "El teléfono debe comenzar con 04 (móvil) o 02 (fijo)."
  elif len(clean_phone) == 10:
      if clean_phone.startswith('4') or clean_phone.startswith('2'):
          return True, "Teléfono válido."
      else:
          return False, "El teléfono debe comenzar con 4 (móvil) o 2 (fijo)."
  else:
      return False, "El teléfono debe tener 10 u 11 dígitos."

# Función para validar email
def validate_email(email):
  if not email:
      return False, "El email no puede estar vacío."
  
  if len(email) > 254:
      return False, "El email es demasiado largo."
  
  # Patrón básico para validar email
  email_pattern = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
  if not email_pattern.match(email):
      return False, "Formato de email inválido."
  
  return True, "Email válido."

# Función para validar dirección
def validate_address(address):
  if not address or len(address.strip()) < 5:
      return False, "La dirección debe tener al menos 5 caracteres."
  if len(address.strip()) > 255:
      return False, "La dirección no puede exceder 255 caracteres."
  # Allow letters, numbers, spaces, commas, periods, hyphens, #, and accents
  address_pattern = re.compile(r"^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s,.\-#]+$")
  if not address_pattern.match(address.strip()):
      return False, "La dirección contiene caracteres inválidos."
  return True, "Dirección válida."

# Función para validar archivos adjuntos
def validate_attachment(file):
  if not file or file.filename == '':
      return True, "Sin archivo adjunto."  # Archivo opcional
  
  if not allowed_file(file.filename):
      return False, f"Tipo de archivo no permitido. Tipos permitidos: {', '.join(ALLOWED_EXTENSIONS)}"
  
  if not validate_file_size(file):
      return False, f"El archivo es demasiado grande. Tamaño máximo: {MAX_FILE_SIZE // (1024*1024)}MB"
  
  return True, "Archivo válido."

# Generar código de verificación (ya no se usará para registro público)
def generar_codigo():
  return ''.join(random.choices(string.digits, k=6))

# Función para calcular inventario disponible por diseño
def calcular_inventario_disenos():
 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   # Obtener inventario actual, incluyendo la nueva columna 'densidad'
   sql_inventario = "SELECT nombre, cantidad, unidad, minimo, densidad FROM inventario"
   cursor.execute(sql_inventario)
   inventario = cursor.fetchall()
   
   # Obtener todos los diseños de concreto de la base de datos
   sql_designs = "SELECT id, nombre, resistencia, asentamiento FROM concrete_designs"
   cursor.execute(sql_designs)
   concrete_designs_db = cursor.fetchall()

   # Convertir inventario a diccionario para fácil acceso
   inventario_dict = {}
   for item in inventario:
    inventario_dict[item['nombre']] = {
     'cantidad': float(item['cantidad']),
     'unidad': item['unidad'],
     'densidad': float(item['densidad']) if item['densidad'] is not None else 1.0 # Default to 1 if density is null
    }
   
   # Calcular cuántos m³ se pueden producir de cada diseño
   resultados = {}
   
   for design_data in concrete_designs_db:
    design_id = design_data['id']
    design_name = design_data['nombre']
    
    # Get materials for the current design
    sql_design_materials = "SELECT material_name, quantity_kg FROM concrete_design_materials WHERE design_id = %s"
    cursor.execute(sql_design_materials, (design_id,))
    design_materials = cursor.fetchall()

    # Combine design-specific materials with universal additives
    all_materials_needed_per_m3 = {}
    for mat in design_materials:
     all_materials_needed_per_m3[mat['material_name']] = float(mat['quantity_kg'])
    
    # Add universal additives if they are not already part of the design
    for additive_name, additive_qty in UNIVERSAL_ADDITIVES_PER_M3.items():
     if additive_name not in all_materials_needed_per_m3:
      all_materials_needed_per_m3[additive_name] = additive_qty
     # Else: assume design-specific quantity overrides or includes universal amount

    m3_posibles = float('inf')  # Iniciar con infinito
    current_limiting_materials = []

    for material, cantidad_necesaria_kg in all_materials_needed_per_m3.items(): # Corrected variable name
     if material in inventario_dict:
      cantidad_disponible = inventario_dict[material]['cantidad']
      material_unidad = inventario_dict[material]['unidad']
      material_densidad = inventario_dict[material]['densidad']

      cantidad_necesaria_en_unidad_inventario = 0
      
      # Use stored density for conversion (kg to inventory unit)
      # Handle cases where density is 0 or None to prevent division by zero
      if material_densidad is None or material_densidad <= 0:
       material_densidad = 1.0 # Default to 1.0 kg/unit if density is invalid or not set
      
      cantidad_necesaria_en_unidad_inventario = cantidad_necesaria_kg / material_densidad

      if cantidad_necesaria_en_unidad_inventario > 0:
       m3_material = cantidad_disponible / cantidad_necesaria_en_unidad_inventario
      else:
       m3_material = float('inf') # Material not needed for this design, or 0 quantity needed
      

      if m3_material < m3_posibles:
       m3_posibles = m3_material
       current_limiting_materials = [material] # Reset if a new material is more limiting
      elif m3_material == m3_posibles and m3_material != float('inf'):
       current_limiting_materials.append(material) # Add if equally limiting
     else:
      # If material is not in inventory, it's a hard limit
      m3_posibles = 0
      current_limiting_materials = [material]
      break
    
    # Determine status based on the fixed minimum of 200 m³
    if m3_posibles == 0:
     estado = 'agotado'
     estado_texto = 'Agotado'
    elif m3_posibles < MINIMO_DOSIFICACION_M3:
     estado = 'limitado'
     estado_texto = f'Bajo Stock ({int(m3_posibles)} m³)'
    else:
     estado = 'disponible'
     estado_texto = 'Disponible'
    
    resultados[design_id] = { # Use design_id as key
     'id': design_id,
     'nombre': design_name,
     'resistencia': design_data['resistencia'],
     'asentamiento': design_data['asentamiento'],
     'm3_posibles': max(0, int(m3_posibles)) if m3_posibles != float('inf') else 0,
     'limitante': current_limiting_materials if current_limiting_materials else "N/A",
     'estado': estado,
     'estado_texto': estado_texto,
     'minimo_requerido': MINIMO_DOSIFICACION_M3
    }
   
   return resultados
   
 except Exception as e:
  return {}
 finally:
  connection.close()

# Función para descontar materiales del inventario
def descontar_materiales_inventario(design_id, m3_despachados):
 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   # Get design materials from DB
   sql_design_materials = "SELECT material_name, quantity_kg FROM concrete_design_materials WHERE design_id = %s"
   cursor.execute(sql_design_materials, (design_id,))
   design_materials = cursor.fetchall()

   if not design_materials:
    raise ValueError(f"Diseño con ID {design_id} no encontrado o sin materiales definidos.")

   # Combine design-specific materials with universal additives
   all_materials_to_discount_per_m3 = {}
   for mat in design_materials:
    all_materials_to_discount_per_m3[mat['material_name']] = float(mat['quantity_kg'])
   
   # Add universal additives if they are not already part of the design
   for additive_name, additive_qty in UNIVERSAL_ADDITIVES_PER_M3.items():
    if additive_name not in all_materials_to_discount_per_m3:
     all_materials_to_discount_per_m3[additive_name] = additive_qty
    # Else: assume design-specific quantity overrides or includes universal amount

   descuentos = {}
   
   # First, calculate all discounts and check availability
   for material, cantidad_por_m3_kg in all_materials_to_discount_per_m3.items():
    cantidad_total_kg = cantidad_por_m3_kg * m3_despachados
    
    # Get the unit and density of the material from the inventory to convert correctly
    sql_get_unit_density = "SELECT unidad, densidad FROM inventario WHERE nombre = %s"
    cursor.execute(sql_get_unit_density, (material,))
    unit_density_result = cursor.fetchone()
    if not unit_density_result:
     # If a material needed for the design (or universal additive) is not in inventory,
     # it's an error. This should ideally be caught by calcular_inventario_disenos first.
     raise ValueError(f"Material '{material}' no encontrado en inventario. Asegúrese de que el material exista en el inventario.")
    
    unidad_inventario = unit_density_result['unidad']
    material_densidad = float(unit_density_result['densidad']) if unit_density_result['densidad'] is not None else 1.0

    # Handle cases where density is 0 or None to prevent division by zero
    if material_densidad <= 0:
     material_densidad = 1.0 # Default to 1.0 kg/unit if density is invalid or not set
     print(f"Warning: Material '{material}' has invalid or zero density ({unit_density_result['densidad']}). Defaulting to 1.0 kg/unit for calculations.")

    cantidad_descuento = cantidad_total_kg / material_densidad
    
    descuentos[material] = cantidad_descuento
   
   # Verify that there is sufficient inventory before discounting
   for material, cantidad_descuento in descuentos.items():
    sql = "SELECT cantidad, unidad FROM inventario WHERE nombre = %s"
    cursor.execute(sql, (material,))
    resultado = cursor.fetchone()
    
    if not resultado:
     raise ValueError(f"Material {material} no encontrado en inventario")
    
    cantidad_actual = float(resultado['cantidad'])
    unidad_inventario = resultado['unidad'] # Get unit for error message
    if cantidad_actual < cantidad_descuento:
     raise ValueError(f"Inventario insuficiente de {material}. Disponible: {cantidad_actual:.2f} {unidad_inventario}, Requerido: {cantidad_descuento:.2f} {unidad_inventario}")
    
   # If we reach here, there is sufficient inventory. Proceed with discounts
   for material, cantidad_descuento in descuentos.items():
    sql = "UPDATE inventario SET cantidad = cantidad - %s WHERE nombre = %s"
    cursor.execute(sql, (cantidad_descuento, material))
   
   connection.commit()
   return descuentos
    
 except Exception as e:
  connection.rollback()
  raise e
 finally:
  connection.close()

# Función para generar alertas de diseños
def generar_alertas_disenos():
 resultados = calcular_inventario_disenos()
 alertas = []

 for diseno_id, diseno in resultados.items():
  if diseno['estado'] == 'agotado':
   alertas.append({
    'tipo': 'critico',
    'diseno': diseno['nombre'],
    'mensaje': f"⚠️ CRÍTICO: {diseno['nombre']} - No se puede producir (Material limitante: {', '.join(diseno['limitante']) if isinstance(diseno['limitante'], list) else diseno['limitante']})",
    'm3_disponibles': diseno['m3_posibles'],
    'material_limitante': diseno['limitante']
   })
  elif diseno['estado'] == 'limitado':
   alertas.append({
    'tipo': 'advertencia',
    'diseno': diseno['nombre'],
    'mensaje': f"⚠️ ADVERTENCIA: {diseno['nombre']} - Solo {diseno['m3_posibles']} m³ disponibles (Mínimo: {MINIMO_DOSIFICACION_M3} m³)",
    'm3_disponibles': diseno['m3_posibles'],
    'material_limitante': diseno['limitante']
   })

 return alertas

# Helper function to format last active time
def format_last_active_display(last_active_dt):
 if not last_active_dt:
  return "Nunca"

 # Ensure it's a datetime object
 if isinstance(last_active_dt, str):
  try:
   last_active_dt = datetime.strptime(last_active_dt, '%Y-%m-%d %H:%M:%S')
  except ValueError:
   return "Fecha inválida" # Should not happen if stored correctly

 now = datetime.now()
 diff = now - last_active_dt

 if diff.total_seconds() < 60:
  return "Hace unos segundos"
 elif diff.total_seconds() < 3600: # Less than 1 hour
  minutes = int(diff.total_seconds() / 60)
  return f"Hace {minutes} minuto{'s' if minutes > 1 else ''}"
 elif diff.total_seconds() < 86400: # Less than 24 hours
  hours = int(diff.total_seconds() / 3600)
  return f"Hace {hours} hora{'s' if hours > 1 else ''}"
 else:
  return last_active_dt.strftime('%Y-%m-%d %H:%M') # Full date and time

# Función para validar el RIF venezolano (formato y dígito verificador)
def validate_venezuelan_rif(rif):
 if not rif:
  return False, "El RIF no puede estar vacío."

 # Formato esperado: [J|V|G|E|P]-d{8}-d
 match = re.match(r'^([JVGEP])-(\d{8})-(\d)$', rif.upper())
 if not match:
  return False, "Formato de RIF inválido. Debe ser [J|V|G|E|P]-XXXXXXXX-X."

 prefix, body_str, check_digit_str = match.groups()
 body_digits = [int(d) for d in body_str]
 check_digit = int(check_digit_str)

 # Pesos para el cálculo del dígito verificador
 weights = [3, 2, 7, 6, 5, 4, 3, 2]

 # Suma ponderada de los dígitos del cuerpo
 weighted_sum = sum(body_digits[i] * weights[i] for i in range(8))

 # Valor del prefijo
 prefix_value = {
  'J': 1, 'G': 9, 'V': 1, 'E': 2, 'P': 3
 }.get(prefix, 0)

 total_sum = weighted_sum + prefix_value

 # Calcular el residuo
 remainder = total_sum % 11

 # Calcular el dígito verificador esperado
 expected_check_digit = 0
 if remainder == 0:
  expected_check_digit = 0
 elif remainder == 1:
  # Casos especiales para el dígito 1
  if prefix in ['V', 'E']: # V y E tienen 0 si el residuo es 1
   expected_check_digit = 0
  else: # J, G, P tienen 9 si el residuo es 1
   expected_check_digit = 9
 else:
  expected_check_digit = 11 - remainder

 if expected_check_digit == check_digit:
  return True, "RIF válido."
 else:
  return False, f"Dígito verificador del RIF incorrecto. Se esperaba {expected_check_digit}."

# Función para validar la Cédula venezolana (formato y longitud)
def validate_venezuelan_cedula(cedula):
 if not cedula:
  return False, "La cédula no puede estar vacía."

 # Formato esperado: [V|J|G|E]-d{6,9} (6 a 9 dígitos para cubrir casos históricos y actuales)
 match = re.match(r'^([VEJG])-(\d{6,9})$', cedula.upper())
 if not match:
  return False, "Formato de cédula inválido. Debe ser [V|E|J|G]-XXXXXXX o [V|E|J|G]-XXXXXXXX."

 # Para cédulas, la validación del dígito verificador es más compleja y no siempre pública.
 # Nos centraremos en el formato y la longitud.
 return True, "Cédula válida."

# Add the new `validate_venezuelan_truck_plate` function:
def validate_venezuelan_truck_plate(plate):
 if not plate:
  return False, "La placa no puede estar vacía."

 # Expected format: LNNLLNL (e.g., A83AK8L)
 # Matches one letter, two digits, two letters, one digit, one letter. Case-insensitive.
 plate_regex = re.compile(r'^[A-Z]{1}\d{2}[A-Z]{2}\d{1}[A-Z]{1}$', re.IGNORECASE)

 if not plate_regex.match(plate):
  return False, "Formato de placa inválido. Debe ser LDDLLDL (ej. A12BC3D)."

 return True, "Placa válida."

# NEW: Helper function to get concrete design name by ID
def get_concrete_design_name_by_id(design_id):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            sql = "SELECT nombre FROM concrete_designs WHERE id = %s"
            cursor.execute(sql, (design_id,))
            result = cursor.fetchone()
            if result:
                return result['nombre']
            return None
    except Exception as e:
        print(f"Error getting concrete design name for ID {design_id}: {str(e)}")
        return None
    finally:
        connection.close()

# NEW API: Get all quotable items (concrete designs and services)
@app.route('/api/all_quotable_items', methods=['GET'])
def get_all_quotable_items():
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            # Fetch concrete designs
            sql_designs = "SELECT id, code, nombre as description, 'concrete_design' as type, resistencia, asentamiento FROM concrete_designs"
            cursor.execute(sql_designs)
            designs = cursor.fetchall()

            # Fetch services
            sql_services = "SELECT id, code, description, 'service' as type, unit_price FROM services"
            cursor.execute(sql_services)
            services = cursor.fetchall()

            # Combine and return
            return jsonify({'designs': designs, 'services': services})
    except Exception as e:
        print(f"Error getting all quotable items: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        connection.close()

# API para obtener inventario de diseños
@app.route('/api/inventario/disenos', methods=['GET'])
def get_inventario_disenos():
 try:
  resultados = calcular_inventario_disenos()
  return jsonify(resultados)
 except Exception as e:
  return jsonify({'error': str(e)}), 500

# API para obtener alertas de diseños
@app.route('/api/alertas/disenos', methods=['GET'])
def get_alertas_disenos():
 try:
  alertas = generar_alertas_disenos()
  return jsonify(alertas)
 except Exception as e:
  return jsonify({'error': str(e)}), 500

# --- API para Diseños de Concreto ---
@app.route('/api/concrete_designs', methods=['GET'])
def get_concrete_designs():
 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   sql = "SELECT id, nombre, resistencia, asentamiento FROM concrete_designs ORDER BY resistencia ASC, asentamiento ASC"
   cursor.execute(sql)
   designs = cursor.fetchall()

   for design in designs:
    sql_materials = "SELECT material_name, quantity_kg FROM concrete_design_materials WHERE design_id = %s"
    cursor.execute(sql_materials, (design['id'],))
    design['materiales'] = cursor.fetchall()
  return jsonify(designs)
 except Exception as e:
  print(f"Error al obtener diseños de concreto: {str(e)}")
  return jsonify({'success': False, 'message': f'Error al obtener diseños de concreto: {str(e)}'}), 500
 finally:
  connection.close()

@app.route('/api/concrete_designs', methods=['POST'])
def add_concrete_design():
 if session.get('user_role') not in ['administrador', 'gerencia', 'control_calidad']:
  return jsonify({'success': False, 'message': 'Acceso denegado'}), 403

 data = request.json
 nombre = data.get('nombre')
 resistencia = data.get('resistencia')
 asentamiento = data.get('asentamiento')
 materiales = data.get('materiales', [])

 if not all([nombre, resistencia, asentamiento]):
  return jsonify({'success': False, 'message': 'Nombre, resistencia y asentamiento son obligatorios.'}), 400
 if not materiales:
  return jsonify({'success': False, 'message': 'Debe añadir al menos un material para el diseño.'}), 400

 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   # Check if design name already exists
   sql_check = "SELECT id FROM concrete_designs WHERE nombre = %s"
   cursor.execute(sql_check, (nombre,))
   if cursor.fetchone():
    return jsonify({'success': False, 'message': 'Ya existe un diseño con este nombre.'}), 409
   
   sql_design = """INSERT INTO concrete_designs (nombre, resistencia, asentamiento) 
         VALUES (%s, %s, %s)"""
   cursor.execute(sql_design, (nombre, resistencia, asentamiento))
   design_id = cursor.lastrowid

   sql_material = """INSERT INTO concrete_design_materials (design_id, material_name, quantity_kg)
         VALUES (%s, %s, %s)"""
   for material in materiales:
    if not all([material.get('material_name'), material.get('quantity_kg') is not None]):
     connection.rollback()
     return jsonify({'success': False, 'message': 'Todos los campos de material (nombre, cantidad) son obligatorios.'}), 400
    if not isinstance(material.get('quantity_kg'), (int, float)) or material.get('quantity_kg') < 0:
     connection.rollback()
     return jsonify({'success': False, 'message': 'La cantidad de material debe ser un número no negativo.'}), 400
    cursor.execute(sql_material, (design_id, material['material_name'], material['quantity_kg']))
   
   connection.commit()
  return jsonify({'success': True, 'message': 'Diseño de concreto registrado exitosamente.'})
 except Exception as e:
  connection.rollback()
  print(f"Error al añadir diseño de concreto: {str(e)}")
  return jsonify({'success': False, 'message': f'Error al registrar diseño de concreto: {str(e)}'}), 500
 finally:
  connection.close()

@app.route('/api/concrete_designs/<int:design_id>', methods=['GET'])
def get_concrete_design_by_id(design_id):
 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   sql_design = "SELECT id, nombre, resistencia, asentamiento FROM concrete_designs WHERE id = %s"
   cursor.execute(sql_design, (design_id,))
   design = cursor.fetchone()

   if not design:
    return jsonify({'success': False, 'message': 'Diseño de concreto no encontrado'}), 404

   sql_materials = "SELECT id, material_name, quantity_kg FROM concrete_design_materials WHERE design_id = %s"
   cursor.execute(sql_materials, (design_id,))
   design['materiales'] = cursor.fetchall()
  return jsonify(design)
 except Exception as e:
  print(f"Error al obtener diseño de concreto por ID: {str(e)}")
  return jsonify({'success': False, 'message': f'Error al obtener diseño de concreto: {str(e)}'}), 500
 finally:
  connection.close()

@app.route('/api/concrete_designs/<int:design_id>', methods=['PUT'])
def update_concrete_design(design_id):
 if session.get('user_role') not in ['administrador', 'gerencia', 'control_calidad']:
  return jsonify({'success': False, 'message': 'Acceso denegado'}), 403

 data = request.json
 nombre = data.get('nombre')
 resistencia = data.get('resistencia')
 asentamiento = data.get('asentamiento')
 materiales = data.get('materiales', [])

 if not all([nombre, resistencia, asentamiento]):
  return jsonify({'success': False, 'message': 'Nombre, resistencia y asentamiento son obligatorios.'}), 400
 if not materiales:
  return jsonify({'success': False, 'message': 'Debe añadir al menos un material para el diseño.'}), 400

 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   # Check if design name already exists for another design
   sql_check = "SELECT id FROM concrete_designs WHERE nombre = %s AND id != %s"
   cursor.execute(sql_check, (nombre, design_id))
   if cursor.fetchone():
    return jsonify({'success': False, 'message': 'Ya existe otro diseño con este nombre.'}), 409

   sql_update_design = """UPDATE concrete_designs SET nombre = %s, resistencia = %s, asentamiento = %s
               WHERE id = %s"""
   cursor.execute(sql_update_design, (nombre, resistencia, asentamiento, design_id))

   # Delete existing materials for this design
   sql_delete_materials = "DELETE FROM concrete_design_materials WHERE design_id = %s"
   cursor.execute(sql_delete_materials, (design_id,))

   # Insert new materials
   sql_insert_material = """INSERT INTO concrete_design_materials (design_id, material_name, quantity_kg)
               VALUES (%s, %s, %s)"""
   for material in materiales:
    if not all([material.get('material_name'), material.get('quantity_kg') is not None]):
     connection.rollback()
     return jsonify({'success': False, 'message': 'Todos los campos de material (nombre, cantidad) son obligatorios.'}), 400
    if not isinstance(material.get('quantity_kg'), (int, float)) or material.get('quantity_kg') < 0:
     connection.rollback()
     return jsonify({'success': False, 'message': 'La cantidad de material debe ser un número no negativo.'}), 400
    cursor.execute(sql_insert_material, (design_id, material['material_name'], material['quantity_kg']))
   
   connection.commit()
  return jsonify({'success': True, 'message': 'Diseño de concreto actualizado exitosamente.'})
 except Exception as e:
  connection.rollback()
  print(f"Error al actualizar diseño de concreto: {str(e)}")
  return jsonify({'success': False, 'message': f'Error al actualizar diseño de concreto: {str(e)}'}), 500
 finally:
  connection.close()

@app.route('/api/concrete_designs/delete/<int:design_id>', methods=['POST'])
def delete_concrete_design(design_id):
 if session.get('user_role') not in ['administrador', 'gerencia', 'control_calidad']:
  return jsonify({'success': False, 'message': 'Acceso denegado'}), 403

 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   # Check for associated despachos
   sql_check_despachos = "SELECT COUNT(*) as count FROM despachos WHERE concrete_design_id = %s"
   cursor.execute(sql_check_despachos, (design_id,))
   if cursor.fetchone()['count'] > 0:
    return jsonify({'success': False, 'message': 'No se puede eliminar el diseño porque tiene despachos asociados.'}), 400

   # Delete materials first (due to CASCADE on design_id)
   sql_delete_materials = "DELETE FROM concrete_design_materials WHERE design_id = %s"
   cursor.execute(sql_delete_materials, (design_id,))

   sql_delete_design = "DELETE FROM concrete_designs WHERE id = %s"
   cursor.execute(sql_delete_design, (design_id,))
   connection.commit()
  return jsonify({'success': True, 'message': 'Diseño de concreto eliminado exitosamente.'})
 except Exception as e:
  connection.rollback()
  print(f"Error al eliminar diseño de concreto: {str(e)}")
  return jsonify({'success': False, 'message': f'Error al eliminar diseño de concreto: {str(e)}'}), 500
 finally:
  connection.close()

# API para obtener diseños disponibles
@app.route('/api/disenos', methods=['GET'])
def get_disenos():
 connection = get_db_connection()
 try:
  # Obtener inventario de diseños para verificar disponibilidad
  inventario_disenos = calcular_inventario_disenos()
  
  disenos_disponibles = []
  sql_get_all_designs = "SELECT id, nombre, resistencia, asentamiento FROM concrete_designs ORDER BY resistencia ASC, asentamiento ASC"
  with connection.cursor() as cursor:
   cursor.execute(sql_get_all_designs)
   all_designs = cursor.fetchall()

  for design_db_data in all_designs:
   design_id = design_db_data['id']
   estado_inventario = inventario_disenos.get(int(design_id), {})
   
   disenos_disponibles.append({
    'id': design_id,
    'nombre': design_db_data['nombre'],
    'resistencia': design_db_data['resistencia'],
    'asentamiento': design_db_data['asentamiento'],
    'disponible': estado_inventario.get('estado', 'agotado') != 'agotado',
    'm3_disponibles': estado_inventario.get('m3_posibles', 0)
   })
  
  return jsonify(disenos_disponibles)
 except Exception as e:
  print(f"Error al obtener diseños: {str(e)}")
  return jsonify({'error': str(e)}), 500
 finally:
  connection.close()

# Rutas para servir archivos estáticos
@app.route('/static/<path:path>')
def serve_static(path):
 return send_from_directory('static', path)

# Rutas para las páginas principales
@app.route('/')
def index():
 return render_template('index.html')

@app.route('/forgot-password')
def forgot_password_page():
 return render_template('forgot-password.html')


@app.route('/dashboard/<role>')
def dashboard(role):
 if 'user_id' not in session:
  flash('Debe iniciar sesión para acceder al dashboard', 'error')
  return redirect(url_for('index'))

 # Mapear nombres de roles a nombres de plantillas
 role_template_map = {
  'administrador': 'dashboard_admin.html',
  'registro': 'dashboard_registro.html',
  'control_calidad': 'dashboard_control_calidad.html',
  'vendedor': 'dashboard_vendedor.html',
  'gerencia': 'dashboard_gerencia.html',
  'sistema': 'dashboard_sistema.html'
 }

 # Get the correct template name
 template_file = role_template_map.get(role)

 if not template_file:
  flash('Rol no reconocido o página no disponible', 'error')
  return redirect(url_for('index'))

 # Get user data from the database
 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   sql = "SELECT * FROM usuarios WHERE id = %s"
   cursor.execute(sql, (session['user_id'],))
   usuario = cursor.fetchone()
 except Exception as e:
  print(f"Error getting user data for dashboard: {str(e)}")
  flash('Error al cargar datos del usuario', 'error')
  return redirect(url_for('index'))
 finally:
  connection.close()

 if not usuario:
  flash('Usuario no encontrado', 'error')
  return redirect(url_for('index'))

 return render_template(template_file, usuario=usuario)


# Rutas para la API
@app.route('/api/login', methods=['POST'])
def login():
 data = request.json
 username = data.get('username')
 password = data.get('password')

 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   # MODIFIED: Added status = 'active' to login query
   sql = "SELECT * FROM usuarios WHERE correo = %s AND contrasena = %s AND verificado = 1 AND status = 'active'"
   cursor.execute(sql, (username, password))
   user = cursor.fetchone()
 
  if user:
   session['user_id'] = user['id']
   session['user_role'] = user['rol']
   session['user_name'] = f"{user['nombre']} {user['apellido']}"
   
   # Update last_active timestamp
   with connection.cursor() as cursor:
    sql_update_active = "UPDATE usuarios SET last_active = NOW() WHERE id = %s"
    cursor.execute(sql_update_active, (user['id'],))
    connection.commit()

   return jsonify({
    'success': True,
    'user': {
     'id': user['id'],
     'nombre': user['nombre'],
     'apellido': user['apellido'],
     'rol': user['rol']
    }
   })
  else:
   return jsonify({'success': False, 'message': 'Credenciales inválidas o cuenta no verificadas o deshabilitada'}), 401
 except Exception as e:
  print(f"Error during login: {str(e)}")
  return jsonify({'success': False, 'message': 'Error interno del servidor'}), 500
 finally:
  connection.close()

@app.route('/api/user/heartbeat', methods=['POST'])
def user_heartbeat():
 if 'user_id' not in session:
  return jsonify({'success': False, 'message': 'Not logged in'}), 401

 user_id = session['user_id']
 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   sql = "UPDATE usuarios SET last_active = NOW() WHERE id = %s"
   cursor.execute(sql, (user_id,))
   connection.commit()
  return jsonify({'success': True})
 except Exception as e:
  print(f"Error updating heartbeat for user {user_id}: {str(e)}")
  return jsonify({'success': False, 'message': 'Error updating heartbeat'}), 500
 finally:
  connection.close()

@app.route('/api/forgot_password', methods=['POST'])
def forgot_password():
    email = request.form.get('email')

    connection = get_db_connection()
    try:
      with connection.cursor() as cursor:
      # Check if email exists
          sql = "SELECT id FROM usuarios WHERE correo = %s"
          cursor.execute(sql, (email,))
          user = cursor.fetchone()

      if not user:
            flash('Si el correo existe, recibirás instrucciones para recuperar tu contraseña.', 'info')
            return redirect(url_for('forgot_password_page'))

          # Generate a recovery token
      token = ''.join(random.choices(string.ascii_letters + string.digits, k=32))
      expiry = datetime.now() + timedelta(hours=1)

      with connection.cursor() as cursor:
          # Save token in the database
          sql = "UPDATE usuarios SET reset_token = %s, reset_token_expiry = %s WHERE id = %s"
          cursor.execute(sql, (token, expiry, user['id']))
          connection.commit()

      # Send email with recovery link
      try:
        reset_link = f"{request.host_url}reset_password?token={token}"
        msg = Message("Recuperación de Contraseña - Prealca", sender=app.config['MAIL_USERNAME'], recipients=[email])
        msg.body = f"Para recuperar tu contraseña, haz clic en el siguiente enlace (válido por 1 hora): {reset_link}"
        mail.send(msg)
      except Exception as e:
        flash(f'Error al enviar correo: {str(e)}', 'error')
        return redirect(url_for('forgot_password_page'))

      flash('Se han enviado instrucciones a tu correo para recuperar tu contraseña.', 'info')
      return redirect(url_for('index'))
    except Exception as e:
      print(f"Error in forgot_password: {str(e)}")
      flash(f'Error interno del servidor: {str(e)}', 'error')
      return redirect(url_for('forgot_password_page'))
    finally:
      connection.close()

@app.route('/reset_password', methods=['GET', 'POST'])
def reset_password():
  token = request.args.get('token')

  if not token:
    flash('Token inválido o expirado.', 'error')
    return redirect(url_for('index'))

  if request.method == 'POST':
    new_password = request.form.get('new_password')
    confirm_password = request.form.get('confirm_password')

    if new_password != confirm_password:
      flash('Las contraseñas no coinciden.', 'error')
      return render_template('reset_password.html', token=token)

    connection = get_db_connection()
    try:
      with connection.cursor() as cursor:
        # Check if token is valid and not expired
        sql = "SELECT id FROM usuarios WHERE reset_token = %s AND reset_token_expiry > %s"
        cursor.execute(sql, (token, datetime.now()))
        user = cursor.fetchone()

        if not user:
          flash('Token inválido o expirado.', 'error')
          return redirect(url_for('index'))

        # Update password and clear token
        sql = "UPDATE usuarios SET contrasena = %s, reset_token = NULL, reset_token_expiry = NULL WHERE id = %s"
        cursor.execute(sql, (new_password, user['id']))
        connection.commit()
      flash('Tu contraseña ha sido actualizada. Ya puedes iniciar sesión.', 'success')
      return redirect(url_for('index'))
    except Exception as e:
      print(f"Error in reset_password POST: {str(e)}")
      flash(f'Error al actualizar contraseña: {str(e)}', 'error')
      return render_template('reset_password.html', token=token)
    finally:
      connection.close()

  # Renderizar en caso de GET o si falló algún proceso del POST
  return render_template('reset_password.html', token=token)


@app.route('/api/logout', methods=['POST'])
def logout():
 session.clear()
 return jsonify({'success': True})

# Define role descriptions
ROLE_DESCRIPTIONS = {
'administrador': 'gestionar usuarios, despachos, inventario, camiones, choferes y vendedores, así como generar guías de compra.',
'registro': 'registrar nuevos despachos y gestionar clientes.',
'control_calidad': 'supervisar la calidad de los materiales y los procesos de producción.',
'vendedor': 'gestionar clientes y registrar cotizaciones.',
'gerencia': 'gestionar todos los registros de clientes, choferes, camiones, vendedores, guías de despacho, guías de compra, mantenimiento de camiones, inventario y gestión de usuarios, con la capacidad de modificar, agregar y eliminar.',
'sistema': 'gestionar usuarios y agregar nuevos usuarios al sistema.'
}

# API for Admin to add new users
@app.route('/api/admin/users', methods=['POST'])
def admin_add_user():
 print(f"DEBUG: admin_add_user - User role: {session.get('user_role')}")
 if session.get('user_role') not in ['sistema', 'gerencia']:
  return jsonify({'success': False, 'message': 'Acceso denegado'}), 403

 nombre = request.form.get('nombre')
 apellido = request.form.get('apellido')
 documento_type = request.form.get('documento_type')
 documento_number = request.form.get('documento_number')
 cedula = f"{documento_type}-{documento_number}"
 correo = request.form.get('correo')
 contrasena = request.form.get('contrasena')
 rol = request.form.get('rol')
 direccion = request.form.get('direccion')
 telefono = request.form.get('telefono')

 # Basic validation
 print(f"DEBUG: admin_add_user - Received data: Nombre={nombre}, Apellido={apellido}, Cedula={cedula}, Correo={correo}, Rol={rol}, Direccion={direccion}, Telefono={telefono}")
 if not all([nombre, apellido, documento_type, documento_number, correo, contrasena, rol, direccion, telefono]):
  print("DEBUG: Server-side validation failed: Missing required fields. Values received:")
  print(f"  nombre: '{nombre}'")
  print(f"  apellido: '{apellido}'")
  print(f"  documento_type: '{documento_type}'")
  print(f"  documento_number: '{documento_number}'")
  print(f"  correo: '{correo}'")
  print(f"  contrasena: '{contrasena}'")
  print(f"  rol: '{rol}'")
  print(f"  direccion: '{direccion}'")
  print(f"  telefono: '{telefono}'")
  missing_fields = [f for f in ['nombre', 'apellido', 'documento_type', 'documento_number', 'correo', 'contrasena', 'rol', 'direccion', 'telefono'] if not request.form.get(f)]
  print(f"DEBUG: Missing fields: {missing_fields}")
  return jsonify({'success': False, 'message': 'Todos los campos son obligatorios'}), 400

 # Validate fields
 is_valid_name, name_message = validate_name(nombre)
 if not is_valid_name:
  print(f"DEBUG: Server-side name validation failed: {name_message}")
  return jsonify({'success': False, 'message': name_message}), 400

 is_valid_apellido, apellido_message = validate_name(apellido)
 if not is_valid_apellido:
  print(f"DEBUG: Server-side apellido validation failed: {apellido_message}")
  return jsonify({'success': False, 'message': apellido_message}), 400

 is_valid_cedula, cedula_message = validate_venezuelan_cedula(cedula)
 if not is_valid_cedula:
  print(f"DEBUG: Server-side cedula validation failed: {cedula_message}")
  return jsonify({'success': False, 'message': cedula_message}), 400

 is_valid_email, email_message = validate_email(correo)
 if not is_valid_email:
  print(f"DEBUG: Server-side email validation failed: {email_message}")
  return jsonify({'success': False, 'message': email_message}), 400

 is_valid_address, address_message = validate_address(direccion)
 if not is_valid_address:
  print(f"DEBUG: Server-side address validation failed: {address_message}")
  return jsonify({'success': False, 'message': address_message}), 400

 is_valid_phone, phone_message = validate_phone(telefono)
 if not is_valid_phone:
  print(f"DEBUG: Server-side phone validation failed: {phone_message}")
  return jsonify({'success': False, 'message': phone_message}), 400

 foto_path = None
 if 'foto' in request.files and request.files['foto'].filename != '':
  foto = request.files['foto']
  if foto and allowed_file(foto.filename):
   if not validate_file_size(foto):
    return jsonify({'success': False, 'message': f"El archivo de foto es demasiado grande. Tamaño máximo: {MAX_FILE_SIZE // (1024*1024)}MB"}), 400
   try:
    filename = secure_filename(f"{cedula}_{datetime.now().strftime('%Y%m%d%H%M%S')}.{foto.filename.rsplit('.', 1)[1].lower()}")
    foto.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
    foto_path = f"/static/uploads/{filename}"
    print(f"DEBUG: admin_add_user - Photo saved to: {os.path.join(app.config['UPLOAD_FOLDER'], filename)}")
   except Exception as e:
    print(f"Error saving photo for admin add user: {str(e)}")
    return jsonify({'success': False, 'message': f'Error al guardar la foto: {str(e)}'}), 500
  else:
   return jsonify({'success': False, 'message': 'Tipo de archivo de foto no permitido.'}), 400

 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   print(f"DEBUG: admin_add_user - Checking if email '{correo}' already exists.")
   sql_check = "SELECT id FROM usuarios WHERE correo = %s"
   cursor.execute(sql_check, (correo,))
   if cursor.fetchone():
    return jsonify({'success': False, 'message': 'El correo ya está registrado'}), 409
   
   sql_check_cedula_usuarios = "SELECT id FROM usuarios WHERE cedula = %s"
   cursor.execute(sql_check_cedula_usuarios, (cedula,))
   if cursor.fetchone():
    return jsonify({'success': False, 'message': 'La cédula ya está registrada para otro usuario en el sistema.'}), 409

   reset_token = ''.join(random.choices(string.ascii_letters + string.digits, k=32))
   reset_token_expiry = datetime.now() + timedelta(hours=24)

   print(f"DEBUG: admin_add_user - Inserting new user: {nombre} {apellido} ({correo}) with role {rol}")
   # MODIFIED: Added status = 'active' to new user insertion
   sql = """INSERT INTO usuarios (nombre, apellido, cedula, correo, contrasena, rol, foto, verificado, last_active, reset_token, reset_token_expiry, direccion, telefono, status) 
         VALUES (%s, %s, %s, %s, %s, %s, %s, 1, NULL, %s, %s, %s, %s, 'active')"""
   cursor.execute(sql, (nombre, apellido, cedula, correo, contrasena, rol, foto_path, reset_token, reset_token_expiry, direccion, telefono))
   connection.commit()
   print(f"DEBUG: User inserted successfully. Rows affected: {cursor.rowcount}")

   if rol == 'vendedor':
    sql_check_cedula_vendedores = "SELECT id FROM vendedores WHERE cedula = %s"
    cursor.execute(sql_check_cedula_vendedores, (cedula,))
    if cursor.fetchone():
     return jsonify({'success': False, 'message': 'La cédula ya está registrada para otro vendedor.'}), 409

    sql_add_vendedor = """INSERT INTO vendedores (nombre, cedula, telefono, direccion, correo)
              VALUES (%s, %s, %s, %s, %s)"""
    cursor.execute(sql_add_vendedor, (nombre, cedula, telefono, direccion, correo))
    connection.commit()
    print(f"DEBUG: admin_add_user - Vendedor '{nombre}' added to vendedores table with full details.")

   try:
    user_full_name = f"{nombre} {apellido}"
    role_description = ROLE_DESCRIPTIONS.get(rol, 'sin descripción específica.')
    
    login_url = request.host_url.rstrip('/')
    reset_password_url = f"{request.host_url}reset_password?token={reset_token}"
    logo_url = f"{request.host_url}static/uploads/Logo.png"

    html_body = render_template(
     'welcome_email.html',
     user_name=user_full_name,
     user_email=correo,
     user_password=contrasena,
     user_role_name=rol.capitalize(),
     role_description=role_description,
     login_url=login_url,
     reset_password_url=reset_password_url,
     logo_url=logo_url,
     current_year=datetime.now().year
    )

    msg = Message(
     subject="¡Bienvenido a Prealca! Tu cuenta ha sido creada",
     sender=app.config['MAIL_USERNAME'],
     recipients=[correo]
    )
    msg.html = html_body
    mail.send(msg)
    print(f"DEBUG: Welcome email sent to {correo}")
   except Exception as mail_e:
    print(f"ERROR: Failed to send welcome email to {correo}: {str(mail_e)}")
    print(f"DEBUG: Returning success=True despite email error for user {correo}")
    return jsonify({'success': True, 'message': 'Usuario agregado exitosamente, pero falló el envío del correo de bienvenida.'})

  print(f"DEBUG: Final return from admin_add_user: success=True, message='Usuario agregado exitosamente'")
  return jsonify({'success': True, 'message': 'Usuario agregado exitosamente'})
 except Exception as e:
  connection.rollback()
  print(f"ERROR: admin_add_user - An unexpected error occurred: {str(e)}")
  print(f"DEBUG: Final return from admin_add_user: success=False, message='Error al agregar usuario: {str(e)}'")
  return jsonify({'success': False, 'message': f'Error al agregar usuario: {str(e)}'}), 500
 finally:
  connection.close()

# API para listar usuarios (para el administrador)
@app.route('/api/admin/users/list', methods=['GET'])
def admin_list_users():
 if session.get('user_role') not in ['administrador', 'gerencia', 'vendedor', 'sistema']:
  return jsonify({'success': False, 'message': 'Acceso denegado'}), 403

 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   # MODIFIED: Added 'status' to the SELECT query
   sql = "SELECT id, nombre, apellido, correo, rol, last_active, foto, status FROM usuarios"
   cursor.execute(sql)
   users = cursor.fetchall()
  
  online_threshold_minutes = 1 
  current_time = datetime.now()

  for user in users:
   user['last_active_display'] = format_last_active_display(user['last_active'])
   if user['last_active']:
    last_active_dt = user['last_active']
    if isinstance(last_active_dt, str):
     try:
      last_active_dt = datetime.strptime(last_active_dt, '%Y-%m-%d %H:%M:%S')
     except ValueError:
      last_active_dt = datetime.min
    
   if (current_time - last_active_dt).total_seconds() < (online_threshold_minutes * 60):
    user['status_online'] = 'Online' # Renamed to avoid conflict with DB 'status'
   else:
    user['status_online'] = 'Offline' # Renamed to avoid conflict with DB 'status'
   
   # Add account status based on DB 'status' column
   user['account_status'] = 'Activo' if user['status'] == 'active' else 'Deshabilitado'

  return jsonify(users)
 except Exception as e:
  print(f"Error listing users: {str(e)}")
  return jsonify({'success': False, 'message': f'Error al listar usuarios: {str(e)}'}), 500
 finally:
  connection.close()

# API para obtener un usuario por ID (para el administrador)
@app.route('/api/admin/users/<int:id>', methods=['GET'])
def admin_get_user_by_id(id):
 if session.get('user_role') not in ['administrador', 'gerencia', 'sistema']:
  return jsonify({'success': False, 'message': 'Acceso denegado'}), 403

 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   # MODIFIED: Added 'status' to the SELECT query
   sql = "SELECT id, nombre, apellido, cedula, correo, rol, foto, direccion, telefono, status FROM usuarios WHERE id = %s"
   cursor.execute(sql, (id,))
   user = cursor.fetchone()
  
  if user:
   return jsonify(user)
  else:
   return jsonify({'success': False, 'message': 'Usuario no encontrado'}), 404
 except Exception as e:
  print(f"Error getting user {id}: {str(e)}")
  return jsonify({'success': False, 'message': f'Error al obtener usuario: {str(e)}'}), 500
 finally:
  connection.close()

# API para actualizar un usuario (para el administrador)
@app.route('/api/admin/users/<int:id>', methods=['POST'])
def admin_update_user(id):
 print(f"DEBUG: admin_update_user - User role: {session.get('user_role')}")
 if session.get('user_role') not in ['administrador', 'gerencia', 'sistema']:
  return jsonify({'success': False, 'message': 'Acceso denegado'}), 403

 nombre = request.form.get('nombre')
 apellido = request.form.get('apellido')
 documento_type = request.form.get('documento_type')
 documento_number = request.form.get('documento_number')
 cedula = f"{documento_type}-{documento_number}"
 correo = request.form.get('correo')
 rol = request.form.get('rol')
 direccion = request.form.get('direccion')
 telefono = request.form.get('telefono')
 # MODIFIED: Allow status to be updated from form
 status = request.form.get('status') 

 print(f"DEBUG: admin_update_user - Received data for user ID {id}: Nombre={nombre}, Apellido={apellido}, Cedula={cedula}, Correo={correo}, Rol={rol}, Direccion={direccion}, Telefono={telefono}, Status={status}")

 if not all([nombre, apellido, documento_type, documento_number, correo, rol, direccion, telefono, status]):
  return jsonify({'success': False, 'message': 'Todos los campos obligatorios deben ser completados'}), 400

 # Validate fields
 is_valid_name, name_message = validate_name(nombre)
 if not is_valid_name:
  print(f"DEBUG: Server-side name validation failed: {name_message}")
  return jsonify({'success': False, 'message': name_message}), 400

 is_valid_apellido, apellido_message = validate_name(apellido)
 if not is_valid_apellido:
  print(f"DEBUG: Server-side apellido validation failed: {apellido_message}")
  return jsonify({'success': False, 'message': apellido_message}), 400

 is_valid_cedula, cedula_message = validate_venezuelan_cedula(cedula)
 if not is_valid_cedula:
  print(f"DEBUG: Server-side cedula validation failed: {cedula_message}")
  return jsonify({'success': False, 'message': cedula_message}), 400

 is_valid_email, email_message = validate_email(correo)
 if not is_valid_email:
  print(f"DEBUG: Server-side email validation failed: {email_message}")
  return jsonify({'success': False, 'message': email_message}), 400

 is_valid_address, address_message = validate_address(direccion)
 if not is_valid_address:
  print(f"DEBUG: Server-side address validation failed: {address_message}")
  return jsonify({'success': False, 'message': address_message}), 400

 is_valid_phone, phone_message = validate_phone(telefono)
 if not is_valid_phone:
  print(f"DEBUG: Server-side phone validation failed: {phone_message}")
  return jsonify({'success': False, 'message': phone_message}), 400

 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   sql_get_current_photo = "SELECT foto FROM usuarios WHERE id = %s"
   cursor.execute(sql_get_current_photo, (id,))
   current_user_data = cursor.fetchone()
   current_foto_path = current_user_data['foto'] if current_user_data else None

   foto_path = current_foto_path

   if 'foto' in request.files and request.files['foto'].filename != '':
    foto = request.files['foto']
    if foto and allowed_file(foto.filename):
     if not validate_file_size(foto):
      return jsonify({'success': False, 'message': f"El archivo de foto es demasiado grande. Tamaño máximo: {MAX_FILE_SIZE // (1024*1024)}MB"}), 400
     try:
      filename = secure_filename(f"{cedula}_{datetime.now().strftime('%Y%m%d%H%M%S')}.{foto.filename.rsplit('.', 1)[1].lower()}")
      foto.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
      foto_path = f"/static/uploads/{filename}"
      if current_foto_path and current_foto_path != '/static/img/user.png' and os.path.exists(os.path.join(app.config['UPLOAD_FOLDER'], os.path.basename(current_foto_path))):
       os.remove(os.path.join(app.config['UPLOAD_FOLDER'], os.path.basename(current_foto_path)))
     except Exception as e:
      print(f"Error saving new photo for user update: {str(e)}")
      return jsonify({'success': False, 'message': f'Error al guardar la nueva foto: {str(e)}'}), 500
    else:
     return jsonify({'success': False, 'message': 'Tipo de archivo de foto no permitido.'}), 400

   print(f"DEBUG: admin_update_user - Checking if email '{correo}' already exists for another user (ID != {id}).")
   sql_check_email = "SELECT id FROM usuarios WHERE correo = %s AND id != %s"
   cursor.execute(sql_check_email, (correo, id))
   if cursor.fetchone():
    return jsonify({'success': False, 'message': 'El correo ya está registrado por otro usuario'}), 409

   print(f"DEBUG: admin_update_user - Checking if cedula '{cedula}' already exists for another user (ID != {id}).")
   sql_check_cedula = "SELECT id FROM usuarios WHERE cedula = %s AND id != %s"
   cursor.execute(sql_check_cedula, (cedula, id))
   if cursor.fetchone():
    return jsonify({'success': False, 'message': 'La cédula ya está registrada por otro usuario'}), 409

   # MODIFIED: Added 'status' to the update query
   update_sql = "UPDATE usuarios SET nombre = %s, apellido = %s, cedula = %s, correo = %s, rol = %s, foto = %s, direccion = %s, telefono = %s, status = %s"
   update_params = [nombre, apellido, cedula, correo, rol, foto_path, direccion, telefono, status]
   
   update_sql += " WHERE id = %s"
   update_params.append(id)

   print(f"DEBUG: admin_update_user - Executing SQL: {update_sql} with params: {update_params}")
   cursor.execute(update_sql, tuple(update_params))
   connection.commit()
   print(f"DEBUG: admin_update_user - User ID {id} updated successfully. Rows affected: {cursor.rowcount}")
  return jsonify({'success': True, 'message': 'Usuario actualizado exitosamente'})
 except Exception as e:
  print(f"ERROR: admin_update_user - Failed to update user ID {id}: {str(e)}")
  return jsonify({'success': False, 'message': f'Error al actualizar usuario: {str(e)}'}), 500
 finally:
  connection.close()

# MODIFIED: Renamed from admin_delete_user to admin_disable_user
@app.route('/api/admin/users/disable/<int:id>', methods=['POST'])
def admin_disable_user(id):
 if session.get('user_role') not in ['administrador', 'gerencia', 'sistema']:
  return jsonify({'success': False, 'message': 'Acceso denegado'}), 403

 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   if session.get('user_id') == id:
    return jsonify({'success': False, 'message': 'No puedes deshabilitar tu propia cuenta.'}), 400

   # MODIFIED: Update status to 'disabled' instead of deleting
   sql = "UPDATE usuarios SET status = 'disabled' WHERE id = %s"
   cursor.execute(sql, (id,))
   connection.commit()
  return jsonify({'success': True, 'message': 'Usuario deshabilitado exitosamente'})
 except Exception as e:
  print(f"Error al deshabilitar usuario: {str(e)}")
  return jsonify({'success': False, 'message': f'Error al deshabilitar usuario: {str(e)}'}), 500
 finally:
  connection.close()

# NEW: API to enable a user
@app.route('/api/admin/users/enable/<int:id>', methods=['POST'])
def admin_enable_user(id):
 if session.get('user_role') not in ['administrador', 'gerencia', 'sistema']:
  return jsonify({'success': False, 'message': 'Acceso denegado'}), 403

 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   # Update status to 'active'
   sql = "UPDATE usuarios SET status = 'active' WHERE id = %s"
   cursor.execute(sql, (id,))
   connection.commit()
  return jsonify({'success': True, 'message': 'Usuario habilitado exitosamente'})
 except Exception as e:
  print(f"Error al habilitar usuario: {str(e)}")
  return jsonify({'success': False, 'message': f'Error al habilitar usuario: {str(e)}'}), 500
 finally:
  connection.close()

# NEW API: Get Vendedor ID for logged-in user
@app.route('/api/get_vendedor_info_by_user_id', methods=['GET'])
def get_vendedor_info_by_user_id():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Usuario no autenticado'}), 401
    
    user_id = session['user_id']
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            # First, get the user's cedula from the 'usuarios' table
            sql_get_user_cedula = "SELECT cedula, rol FROM usuarios WHERE id = %s"
            cursor.execute(sql_get_user_cedula, (user_id,))
            user_data = cursor.fetchone()

            if not user_data or user_data['rol'] != 'vendedor':
                return jsonify({'success': False, 'message': 'Usuario no es un vendedor o no encontrado'}), 404
            
            user_cedula = user_data['cedula']

            # Then, find the corresponding vendedor_id in the 'vendedores' table using cedula
            sql_get_vendedor_id = "SELECT id, nombre FROM vendedores WHERE cedula = %s"
            cursor.execute(sql_get_vendedor_id, (user_cedula,))
            vendedor_info = cursor.fetchone()

            if vendedor_info:
                return jsonify({
                    'success': True,
                    'vendedor_id': vendedor_info['id'],
                    'vendedor_nombre': vendedor_info['nombre']
                })
            else:
                return jsonify({'success': False, 'message': 'No se encontró información de vendedor para este usuario'}), 404
    except Exception as e:
        print(f"Error getting vendedor info for user {user_id}: {str(e)}")
        return jsonify({'success': False, 'message': f'Error interno del servidor: {str(e)}'}), 500
    finally:
        connection.close()

# API para clientes
@app.route('/api/clientes', methods=['GET'])
def get_clientes():
 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   user_role = session.get('user_role')
   user_id = session.get('user_id')
   
   sql_query = """
    SELECT c.*, v.nombre as vendedor_nombre 
    FROM clientes c
    LEFT JOIN vendedores v ON c.vendedor_id = v.id
   """
   query_params = []

   if user_role == 'vendedor' and user_id:
    # Get the cedula of the logged-in user from the 'usuarios' table
    sql_get_user_cedula = "SELECT cedula FROM usuarios WHERE id = %s"
    cursor.execute(sql_get_user_cedula, (user_id,))
    user_cedula_result = cursor.fetchone()
    
    if user_cedula_result:
     user_cedula = user_cedula_result['cedula']
     # Find the corresponding vendedor_id in the 'vendedores' table using cedula
     sql_get_vendedor_id = "SELECT id FROM vendedores WHERE cedula = %s"
     cursor.execute(sql_get_vendedor_id, (user_cedula,))
     vendedor_id_result = cursor.fetchone()
     
     if vendedor_id_result:
      vendedor_id = vendedor_id_result['id']
      sql_query += " WHERE c.vendedor_id = %s"
      query_params.append(vendedor_id)
     else:
      # If no corresponding seller found, return empty list
      return jsonify([]) # <--- This returns an empty JSON array
    else:
     # If user not found in 'usuarios', return empty list
     return jsonify([]) # <--- This returns an empty JSON array

   cursor.execute(sql_query, tuple(query_params))
   clientes = cursor.fetchall()
  return jsonify(clientes) # <--- This returns JSON
 except Exception as e:
  print(f"Error al obtener clientes: {str(e)}")
  return jsonify({'error': str(e)}), 500 # <--- This returns JSON with an error key
 finally:
  connection.close()

@app.route('/api/clientes', methods=['POST'])
def add_cliente():
 if session.get('user_role') not in ['administrador', 'gerencia', 'registro', 'vendedor']:
  return jsonify({'success': False, 'message': 'Acceso denegado'}), 403

 nombre = request.form.get('nombre')
 direccion = request.form.get('direccion')
 telefono = request.form.get('telefono')
 documento_type = request.form.get('documento_type')
 documento_number = request.form.get('documento_number')
 vendedor_id = request.form.get('vendedor')

 documento = f"{documento_type}-{documento_number}"

 # Validate fields
 is_valid_name, name_message = validate_name(nombre)
 if not is_valid_name:
  return jsonify({'success': False, 'message': name_message}), 400

 is_valid_address, address_message = validate_address(direccion)
 if not is_valid_address:
  return jsonify({'success': False, 'message': address_message}), 400

 is_valid_phone, phone_message = validate_phone(telefono)
 if not is_valid_phone:
  return jsonify({'success': False, 'message': phone_message}), 400

 # Determine if it's a RIF or Cédula based on the document_type
 if documento_type in ['J', 'G', 'E', 'P']: # RIF prefixes
     is_valid_document, document_message = validate_venezuelan_rif(documento)
 else: # Assume Cédula for V
     is_valid_document, document_message = validate_venezuelan_cedula(documento)

 if not is_valid_document:
  return jsonify({'success': False, 'message': document_message}), 400

 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   # Check for existing client by name
   sql_check_name = "SELECT id FROM clientes WHERE nombre = %s"
   cursor.execute(sql_check_name, (nombre,))
   if cursor.fetchone():
    return jsonify({'success': False, 'message': f'Error: Ya existe un cliente con el nombre "{nombre}".'}), 409
  
   # Check for existing client by phone
   sql_check_phone = "SELECT id FROM clientes WHERE telefono = %s"
   cursor.execute(sql_check_phone, (telefono,))
   if cursor.fetchone():
    return jsonify({'success': False, 'message': f'Error: Ya existe un cliente con el teléfono "{telefono}".'}), 409
  
   # Check for existing client by document
   sql_check_document = "SELECT id FROM clientes WHERE documento = %s"
   cursor.execute(sql_check_document, (documento,))
   if cursor.fetchone():
    return jsonify({'success': False, 'message': f'Error: Ya existe un cliente con el documento "{documento}".'}), 409
  
   sql = """INSERT INTO clientes (nombre, direccion, telefono, documento, vendedor_id) 
       VALUES (%s, %s, %s, %s, %s)"""
   cursor.execute(sql, (nombre, direccion, telefono, documento, vendedor_id))
   connection.commit()
  return jsonify({'success': True, 'message': 'Cliente registrado exitosamente'})
 except Exception as e:
  # Catch any other database errors
  connection.rollback()
  print(f"Error al registrar cliente: {str(e)}")
  return jsonify({'success': False, 'message': f'Error interno del servidor al registrar cliente: {str(e)}'}), 500
 finally:
  connection.close()

@app.route('/api/clientes/<int:id>', methods=['GET'], strict_slashes=False)
def get_cliente_by_id(id):
    connection = get_db_connection() # Make sure this function is defined and accessible
    try:
        with connection.cursor() as cursor:
            sql = "SELECT * FROM clientes WHERE id = %s"
            cursor.execute(sql, (id,))
            cliente = cursor.fetchone()

            if cliente:
                cliente_serializable = {
                    'id': cliente['id'],
                    'nombre': cliente['nombre'],
                    'direccion': cliente['direccion'],
                    'telefono': cliente['telefono'],
                    'documento': cliente['documento'],
                    'vendedor_id': cliente['vendedor_id'],
                }
                return jsonify(cliente_serializable)
            else:
                return jsonify({"error": "Cliente no encontrado", "message": f"Cliente con ID {id} no encontrado."}), 404
    except Exception as e:
        print(f"Error al obtener cliente: {str(e)}")
        return jsonify({"error": "Error interno del servidor", "message": str(e)}), 500
    finally:
        connection.close()

# --- Global 500 Error Handler (keep this from previous step) ---
@app.errorhandler(500)
def internal_server_error(e):
    import traceback
    print(traceback.format_exc())
    return jsonify({"error": "Error interno del servidor", "message": "Ha ocurrido un error inesperado en el servidor."}), 500

@app.route('/api/clientes/<int:id>', methods=['POST'])
def update_cliente_by_id(id):
 if session.get('user_role') not in ['administrador', 'gerencia', 'registro', 'vendedor']:
  return jsonify({'success': False, 'message': 'Acceso denegado'}), 403

 nombre = request.form.get('nombre')
 direccion = request.form.get('direccion')
 telefono = request.form.get('telefono')
 documento_type = request.form.get('documento_type')
 documento_number = request.form.get('documento_number')
 vendedor_id = request.form.get('vendedor')

 documento = f"{documento_type}-{documento_number}"

 # Validate fields
 is_valid_name, name_message = validate_name(nombre)
 if not is_valid_name:
  return jsonify({'success': False, 'message': name_message}), 400

 is_valid_address, address_message = validate_address(direccion)
 if not is_valid_address:
  return jsonify({'success': False, 'message': address_message}), 400

 is_valid_phone, phone_message = validate_phone(telefono)
 if not is_valid_phone:
  return jsonify({'success': False, 'message': phone_message}), 400

 # Determine if it's a RIF or Cédula based on the document_type
 if documento_type in ['J', 'G', 'E', 'P']: # RIF prefixes
     is_valid_document, document_message = validate_venezuelan_rif(documento)
 else: # Assume Cédula for V
     is_valid_document, document_message = validate_venezuelan_cedula(documento)

 if not is_valid_document:
  return jsonify({'success': False, 'message': document_message}), 400

 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   sql = "SELECT id FROM clientes WHERE nombre = %s AND id != %s"
   cursor.execute(sql, (nombre, id))
   existing_cliente = cursor.fetchone()
   
   if existing_cliente:
    return jsonify({'success': False, 'message': f'Error: Ya existe otro cliente con el nombre {nombre}'}), 409
  
  with connection.cursor() as cursor:
   sql = "SELECT id FROM clientes WHERE telefono = %s AND id != %s"
   cursor.execute(sql, (telefono, id))
   existing_cliente = cursor.fetchone()
   
   if existing_cliente:
    return jsonify({'success': False, 'message': f'Error: Ya existe otro cliente con el teléfono {telefono}'}), 409
  
  with connection.cursor() as cursor:
   sql = "SELECT id FROM clientes WHERE documento = %s AND id != %s"
   cursor.execute(sql, (documento, id))
   existing_cliente = cursor.fetchone()
   
   if existing_cliente:
    return jsonify({'success': False, 'message': f'Error: El documento {documento} ya le pertenece a otro cliente'}), 409
  
  with connection.cursor() as cursor:
   sql = """UPDATE clientes SET nombre = %s, direccion = %s, telefono = %s, documento = %s, vendedor_id = %s 
       WHERE id = %s"""
   cursor.execute(sql, (nombre, direccion, telefono, documento, vendedor_id, id))
   connection.commit()
  return jsonify({'success': True, 'message': 'Cliente actualizado exitosamente'})

 except Exception as e:
  return jsonify({'success': False, 'message': f'Error al actualizar cliente: {str(e)}'}), 500
 finally:
  connection.close()

@app.route('/api/clientes/delete/<int:id>', methods=['POST'])
def delete_cliente_by_id(id):
 if session.get('user_role') not in ['administrador', 'gerencia', 'registro', 'vendedor']:
  return jsonify({'success': False, 'message': 'Acceso denegado'}), 403

 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   sql = "SELECT COUNT(*) as count FROM despachos WHERE cliente_id = %s"
   cursor.execute(sql, (id,))
   result = cursor.fetchone()
   if result and result['count'] > 0:
    return jsonify({'success': False, 'message': 'No se puede eliminar el cliente porque tiene despachos asociados'}), 400
  
  with connection.cursor() as cursor:
   sql = "DELETE FROM clientes WHERE id = %s"
   cursor.execute(sql, (id,))
   connection.commit()
  return jsonify({'success': True, 'message': 'Cliente eliminado exitosamente'})
 except Exception as e:
  return jsonify({'success': False, 'message': f'Error al eliminar cliente: {str(e)}'}), 500
 finally:
  connection.close()

# API para camiones
@app.route('/api/camiones', methods=['GET'])
def get_camiones():
 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   sql = "SELECT *, current_odometer FROM camiones"
   cursor.execute(sql)
   camiones = cursor.fetchall()
  return jsonify(camiones)
 except Exception as e:
  print(f"Error al obtener camiones: {str(e)}")
  return jsonify({'error': str(e)}), 500
 finally:
  connection.close()

@app.route('/api/camiones', methods=['POST'])
def add_camion():
 if session.get('user_role') not in ['administrador', 'gerencia']:
  return jsonify({'success': False, 'message': 'Acceso denegado'}), 403

 marca = request.form.get('marca')
 modelo = request.form.get('modelo')
 placa = request.form.get('placa')
 capacidad = request.form.get('capacidad')
 estado = request.form.get('estado', 'Activo')
 current_odometer = int(request.form.get('current_odometer', 0))

 # Validate fields
 is_valid_marca, marca_message = validate_name(marca)
 if not is_valid_marca:
  return jsonify({'success': False, 'message': marca_message}), 400

 is_valid_modelo, modelo_message = validate_name(modelo)
 if not is_valid_modelo:
  return jsonify({'success': False, 'message': modelo_message}), 400

 is_valid_plate, plate_message = validate_venezuelan_truck_plate(placa)
 if not is_valid_plate:
  return jsonify({'success': False, 'message': plate_message}), 400

 if not capacidad or float(capacidad) <= 0:
  return jsonify({'success': False, 'message': 'La capacidad debe ser un número positivo.'}), 400

 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   sql = "SELECT id FROM camiones WHERE placa = %s"
   cursor.execute(sql, (placa,))
   existing_camion = cursor.fetchone()
   
   if existing_camion:
    return jsonify({'success': False, 'message': f'Error: El número de placa {placa} ya le pertenece a otro camión'}), 409
   
   with connection.cursor() as cursor:
    sql = """INSERT INTO camiones (marca, modelo, placa, capacidad, estado, current_odometer) 
          VALUES (%s, %s, %s, %s, %s, %s)"""
    cursor.execute(sql, (marca, modelo, placa, capacidad, estado, current_odometer))
    connection.commit()
   return jsonify({'success': True, 'message': 'Camión registrado exitosamente'})
 except Exception as e:
   return jsonify({'success': False, 'message': f'Error al registrar camión: {str(e)}'}), 500

 finally:
   connection.close()

@app.route('/api/camiones/<int:id>', methods=['GET'])
def get_camion_by_id(id):
 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   sql = "SELECT * FROM camiones WHERE id = %s"
   cursor.execute(sql, (id,))
   camion = cursor.fetchone()
   
  if camion:
   camion_serializable = {
    'id': camion['id'],
    'marca': camion['marca'],
    'modelo': camion['modelo'],
    'placa': camion['placa'],
    'capacidad': float(camion['capacidad']),
    'estado': camion['estado'],
    'current_odometer': camion['current_odometer']
   }
   return jsonify(camion_serializable)
  else:
   return jsonify({"error": "Camión no encontrado"}), 404
 except Exception as e:
  print(f"Error al obtener camión: {str(e)}")
  return jsonify({"error": str(e)}), 500
 finally:
  connection.close()

@app.route('/api/camiones/<int:id>/odometer', methods=['GET'])
def get_camion_odometer(id):
 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   sql = "SELECT current_odometer FROM camiones WHERE id = %s"
   cursor.execute(sql, (id,))
   odometer_data = cursor.fetchone()
   
  if odometer_data:
   return jsonify({'current_odometer': odometer_data['current_odometer']})
  else:
   return jsonify({"error": "Camión no encontrado"}), 404
 except Exception as e:
  print(f"Error al obtener odómetro del camión: {str(e)}")
  return jsonify({"error": str(e)}), 500
 finally:
  connection.close()

@app.route('/api/camiones/<int:id>', methods=['POST'])
def update_camion(id):
 if session.get('user_role') not in ['administrador', 'gerencia']:
  return jsonify({'success': False, 'message': 'Acceso denegado'}), 403

 marca = request.form.get('marca')
 modelo = request.form.get('modelo')
 placa = request.form.get('placa')
 capacidad = request.form.get('capacidad')
 estado = request.form.get('estado', 'Activo')
 current_odometer = int(request.form.get('current_odometer', 0))

 # Validate fields
 is_valid_marca, marca_message = validate_name(marca)
 if not is_valid_marca:
  return jsonify({'success': False, 'message': marca_message}), 400

 is_valid_modelo, modelo_message = validate_name(modelo)
 if not is_valid_modelo:
  return jsonify({'success': False, 'message': modelo_message}), 400

 is_valid_plate, plate_message = validate_venezuelan_truck_plate(placa)
 if not is_valid_plate:
  return jsonify({'success': False, 'message': plate_message}), 400

 if not capacidad or float(capacidad) <= 0:
  return jsonify({'success': False, 'message': 'La capacidad debe ser un número positivo.'}), 400

 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   sql = "SELECT id FROM camiones WHERE placa = %s AND id != %s"
   cursor.execute(sql, (placa, id))
   existing_camion = cursor.fetchone()
   
   if existing_camion:
    return jsonify({'success': False, 'message': f'Error: El número de placa {placa} ya le pertenece a otro camión'}), 409
   
   with connection.cursor() as cursor:
    sql = """UPDATE camiones SET marca = %s, modelo = %s, placa = %s, capacidad = %s, estado = %s, current_odometer = %s
          WHERE id = %s"""
    cursor.execute(sql, (marca, modelo, placa, capacidad, estado, current_odometer, id))
    connection.commit()
   return jsonify({'success': True, 'message': 'Camión actualizado exitosamente'})
 except Exception as e:
  return jsonify({'success': False, 'message': f'Error al actualizar camión: {str(e)}'}), 500
 finally:
  connection.close()

@app.route('/api/camiones/delete/<int:id>', methods=['POST'])
def delete_camion(id):
 if session.get('user_role') not in ['administrador', 'gerencia']:
  return jsonify({'success': False, 'message': 'Acceso denegado'}), 403

 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   sql = "SELECT COUNT(*) as count FROM mantenimiento WHERE camion_id = %s"
   cursor.execute(sql, (id,))
   result = cursor.fetchone()
   if result and result['count'] > 0:
    return jsonify({'success': False, 'message': 'No se puede eliminar el camión porque tiene mantenimientos registrados'}), 400
   
  with connection.cursor() as cursor:
   sql = "DELETE FROM camiones WHERE id = %s"
   cursor.execute(sql, (id,))
   connection.commit()
  return jsonify({'success': True, 'message': 'Camión eliminado exitosamente'})
 except Exception as e:
  return jsonify({'success': False, 'message': f'Error al eliminar camión: {str(e)}'}), 500
 finally:
  connection.close()

# API para choferes
@app.route('/api/choferes', methods=['GET'])
def get_choferes():
 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   sql = "SELECT * FROM choferes"
   cursor.execute(sql)
   choferes = cursor.fetchall()
  return jsonify(choferes)
 except Exception as e:
  print(f"Error al obtener choferes: {str(e)}")
  return jsonify({'error': str(e)}), 500
 finally:
  connection.close()

@app.route('/api/choferes', methods=['POST'])
def add_chofer():
 if session.get('user_role') not in ['administrador', 'gerencia']:
  return jsonify({'success': False, 'message': 'Acceso denegado'}), 403

 nombre = request.form.get('nombre')
 documento_type = request.form.get('documento_type')
 documento_number = request.form.get('documento_number')
 cedula = f"{documento_type}-{documento_number}"

 licencia = request.form.get('licencia')
 vencimiento_licencia = request.form.get('vencimientoLicencia')
 certificado_medico = request.form.get('certificadoMedico')
 vencimiento_certificado = request.form.get('vencimientoCertificado')

 # Validate fields
 is_valid_name, name_message = validate_name(nombre)
 if not is_valid_name:
  return jsonify({'success': False, 'message': name_message}), 400

 is_valid_doc, doc_message = validate_venezuelan_cedula(cedula)
 if not is_valid_doc:
  return jsonify({'success': False, 'message': doc_message}), 400

 if not licencia:
  return jsonify({'success': False, 'message': 'El número de licencia es obligatorio.'}), 400

 if not vencimiento_licencia:
  return jsonify({'success': False, 'message': 'La fecha de vencimiento de la licencia es obligatoria.'}), 400

 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   sql = "SELECT id FROM choferes WHERE cedula = %s"
   cursor.execute(sql, (cedula,))
   existing_chofer = cursor.fetchone()
   
   if existing_chofer:
    return jsonify({'success': False, 'message': f'Error: La cédula {cedula} ya le pertenece a otro chofer'}), 409

  with connection.cursor() as cursor:
   sql = """INSERT INTO choferes (nombre, cedula, licencia, vencimiento_licencia, certificado_medico, vencimiento_certificado) 
         VALUES (%s, %s, %s, %s, %s, %s)"""
   cursor.execute(sql, (nombre, cedula, licencia, vencimiento_licencia, certificado_medico, vencimiento_certificado))
   connection.commit()
  return jsonify({'success': True, 'message': 'Chofer registrado exitosamente'})
 except Exception as e:
  return jsonify({'success': False, 'message': f'Error al registrar chofer: {str(e)}'}), 500
 finally:
  connection.close()

@app.route('/api/choferes/<int:id>', methods=['GET'])
def get_chofer_by_id(id):
 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   sql = "SELECT * FROM choferes WHERE id = %s"
   cursor.execute(sql, (id,))
   chofer = cursor.fetchone()
   
  if chofer:
   chofer_serializable = {
    'id': chofer['id'],
    'nombre': chofer['nombre'],
    'cedula': chofer['cedula'],
    'licencia': chofer['licencia'],
    'vencimiento_licencia': chofer['vencimiento_licencia'].strftime('%Y-%m-%d') if isinstance(chofer['vencimiento_licencia'], (datetime, date)) else None,
    'certificado_medico': chofer['certificado_medico'] if chofer['certificado_medico'] else None,
    'vencimiento_certificado': chofer['vencimiento_certificado'].strftime('%Y-%m-%d') if isinstance(chofer['vencimiento_certificado'], (datetime, date)) else None
   }
   return jsonify(chofer_serializable)
  else:
   return jsonify({"error": "Chofer no encontrado"}), 404
 except Exception as e:
  print(f"Error al obtener chofer: {str(e)}")
  return jsonify({"error": str(e)}), 500
 finally:
  connection.close()

@app.route('/api/choferes/<int:id>', methods=['POST'])
def update_chofer_by_id(id):
 if session.get('user_role') not in ['administrador', 'gerencia']:
  return jsonify({'success': False, 'message': 'Acceso denegado'}), 403

 documento_type = request.form.get('documento_type')
 documento_number = request.form.get('documento_number')
 cedula = f"{documento_type}-{documento_number}"

 nombre = request.form.get('nombre')
 licencia = request.form.get('licencia')
 vencimiento_licencia = request.form.get('vencimientoLicencia')
 certificado_medico = request.form.get('certificadoMedico')
 vencimiento_certificado = request.form.get('vencimientoCertificado')

 # Validate fields
 is_valid_name, name_message = validate_name(nombre)
 if not is_valid_name:
  return jsonify({'success': False, 'message': name_message}), 400

 is_valid_doc, doc_message = validate_venezuelan_cedula(cedula)
 if not is_valid_doc:
  return jsonify({'success': False, 'message': doc_message}), 400

 if not licencia:
  return jsonify({'success': False, 'message': 'El número de licencia es obligatorio.'}), 400

 if not vencimiento_licencia:
  return jsonify({'success': False, 'message': 'La fecha de vencimiento de la licencia es obligatoria.'}), 400

 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   sql = "SELECT id FROM choferes WHERE cedula = %s AND id != %s"
   cursor.execute(sql, (cedula, id))
   existing_chofer = cursor.fetchone()
   
   if existing_chofer:
    return jsonify({'success': False, 'message': f'Error: La cédula {cedula} ya le pertenece a otro chofer'}), 409
   
  with connection.cursor() as cursor:
   sql = """UPDATE choferes SET nombre = %s, cedula = %s, licencia = %s, 
       vencimiento_licencia = %s, certificado_medico = %s, vencimiento_certificado = %s 
       WHERE id = %s"""
   cursor.execute(sql, (nombre, cedula, licencia, vencimiento_licencia, 
               certificado_medico, vencimiento_certificado, id))
   connection.commit()
  return jsonify({'success': True, 'message': 'Chofer actualizado exitosamente'})
 except Exception as e:
  return jsonify({'success': False, 'message': f'Error al actualizar chofer: {str(e)}'}), 500
 finally:
  connection.close()

@app.route('/api/choferes/delete/<int:id>', methods=['POST'])
def delete_chofer_by_id(id):
 if session.get('user_role') not in ['administrador', 'gerencia']:
  return jsonify({'success': False, 'message': 'Acceso denegado'}), 403

 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   sql = "SELECT COUNT(*) as count FROM despachos WHERE chofer_id = %s"
   cursor.execute(sql, (id,))
   result = cursor.fetchone()
   if result and result['count'] > 0:
    return jsonify({'success': False, 'message': 'No se puede eliminar el chofer porque tiene despachos asociados'}), 400
  
  with connection.cursor() as cursor:
   sql = "DELETE FROM choferes WHERE id = %s"
   cursor.execute(sql, (id,))
   connection.commit()
  return jsonify({'success': True, 'message': 'Chofer eliminado exitosamente'})
 except Exception as e:
  return jsonify({'success': False, 'message': f'Error al eliminar chofer: {str(e)}'}), 500
 finally:
  connection.close()

# API para vendedores
@app.route('/api/vendedores', methods=['GET'])
def get_vendedores():
 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   sql = "SELECT id, nombre, cedula, telefono, direccion, correo FROM vendedores"
   cursor.execute(sql)
   vendedores = cursor.fetchall()
  return jsonify(vendedores)
 except Exception as e:
  print(f"Error al obtener vendedores: {str(e)}")
  return jsonify({'error': str(e)}), 500
 finally:
  connection.close()

@app.route('/api/vendedores', methods=['POST'])
def add_vendedor():
 if session.get('user_role') not in ['administrador', 'gerencia']:
  return jsonify({'success': False, 'message': 'Acceso denegado'}), 403

 nombre = request.form.get('nombre')
 documento_type = request.form.get('documento_type')
 documento_number = request.form.get('documento_number')
 telefono = request.form.get('telefono')
 direccion = request.form.get('direccion')
 correo = request.form.get('correo')

 cedula = f"{documento_type}-{documento_number}"

 # Validate fields
 is_valid_name, name_message = validate_name(nombre)
 if not is_valid_name:
  return jsonify({'success': False, 'message': name_message}), 400

 is_valid_doc, doc_message = validate_venezuelan_cedula(cedula)
 if not is_valid_doc:
  return jsonify({'success': False, 'message': doc_message}), 400

 is_valid_phone, phone_message = validate_phone(telefono)
 if not is_valid_phone:
  return jsonify({'success': False, 'message': phone_message}), 400

 is_valid_address, address_message = validate_address(direccion)
 if not is_valid_address:
  return jsonify({'success': False, 'message': address_message}), 400

 is_valid_email, email_message = validate_email(correo)
 if not is_valid_email:
  return jsonify({'success': False, 'message': email_message}), 400

 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   sql_check_cedula = "SELECT id FROM vendedores WHERE cedula = %s"
   cursor.execute(sql_check_cedula, (cedula,))
   if cursor.fetchone():
    return jsonify({'success': False, 'message': f'Error: La cédula {cedula} ya le pertenece a otro vendedor'}), 409

   sql = """INSERT INTO vendedores (nombre, cedula, telefono, direccion, correo)
       VALUES (%s, %s, %s, %s, %s)"""
   cursor.execute(sql, (nombre, cedula, telefono, direccion, correo))
   connection.commit()
  return jsonify({'success': True, 'message': 'Vendedor registrado exitosamente'})
 except Exception as e:
  connection.rollback()
  print(f"Error al registrar vendedor: {str(e)}")
  return jsonify({'success': False, 'message': f'Error al registrar vendedor: {str(e)}'}), 500
 finally:
  connection.close()

@app.route('/api/vendedores/<int:id>', methods=['GET'])
def get_vendedor_by_id(id):
 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   sql = "SELECT id, nombre, cedula, telefono, direccion, correo FROM vendedores WHERE id = %s"
   cursor.execute(sql, (id,))
   vendedor = cursor.fetchone()
   
  if vendedor:
   vendedor_serializable = {
    'id': vendedor['id'],
    'nombre': vendedor['nombre'],
    'cedula': vendedor['cedula'],
    'telefono': vendedor['telefono'],
    'direccion': vendedor['direccion'],
    'correo': vendedor['correo']
   }
   return jsonify(vendedor_serializable)
  else:
   return jsonify({"error": "Vendedor no encontrado"}), 404
 except Exception as e:
  print(f"Error al obtener vendedor: {str(e)}")
  return jsonify({"error": str(e)}), 500
 finally:
  connection.close()

@app.route('/api/vendedores/<int:id>', methods=['POST'])
def update_vendedor_by_id(id):
    if session.get('user_role') not in ['administrador', 'gerencia']:
        return jsonify({'success': False, 'message': 'Acceso denegado'}), 403

    nombre = request.form.get('nombre')
    documento_type = request.form.get('documento_type')
    documento_number = request.form.get('documento_number')
    telefono = request.form.get('telefono')
    direccion = request.form.get('direccion')
    correo = request.form.get('correo')

    cedula = f"{documento_type}-{documento_number}"

    # Validate fields
    is_valid_name, name_message = validate_name(nombre)
    if not is_valid_name:
        return jsonify({'success': False, 'message': name_message}), 400

    is_valid_doc, doc_message = validate_venezuelan_cedula(cedula)
    if not is_valid_doc:
        return jsonify({'success': False, 'message': doc_message}), 400

    is_valid_phone, phone_message = validate_phone(telefono)
    if not is_valid_phone:
        return jsonify({'success': False, 'message': phone_message}), 400

    is_valid_address, address_message = validate_address(direccion)
    if not is_valid_address:
        return jsonify({'success': False, 'message': address_message}), 400

    is_valid_email, email_message = validate_email(correo)
    if not is_valid_email:
        return jsonify({'success': False, 'message': email_message}), 400

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            sql_check_cedula = "SELECT id FROM vendedores WHERE cedula = %s AND id != %s"
            cursor.execute(sql_check_cedula, (cedula, id))
            if cursor.fetchone():
                return jsonify({'success': False, 'message': f'Error: La cédula {cedula} ya le pertenece a otro vendedor'}), 409

            sql = """UPDATE vendedores SET nombre = %s, cedula = %s, telefono = %s, direccion = %s, correo = %s
                WHERE id = %s"""
            cursor.execute(sql, (nombre, cedula, telefono, direccion, correo, id))
            connection.commit()
            return jsonify({'success': True, 'message': 'Vendedor actualizado exitosamente'})
    except Exception as e:
        connection.rollback()
        print(f"Error al actualizar vendedor: {str(e)}")
        return jsonify({'success': False, 'message': f'Error al actualizar vendedor: {str(e)}'}), 500
    finally:
        connection.close()

@app.route('/api/vendedores/delete/<int:id>', methods=['POST'])
def delete_vendedor_by_id(id):
 if session.get('user_role') not in ['administrador', 'gerencia']:
  return jsonify({'success': False, 'message': 'Acceso denegado'}), 403

 connection = get_db_connection()
 try:
  # Check if there are clients associated with this seller
  with connection.cursor() as cursor:
   sql = "SELECT COUNT(*) as count FROM clientes WHERE vendedor_id = %s"
   cursor.execute(sql, (id,))
   result = cursor.fetchone()
   if result and result['count'] > 0:
    return jsonify({'success': False, 'message': 'No se puede eliminar el vendedor porque tiene clientes asociados'}), 400
  
  # If no clients, delete the seller
  with connection.cursor() as cursor:
   sql = "DELETE FROM vendedores WHERE id = %s"
   cursor.execute(sql, (id,))
   connection.commit()
  return jsonify({'success': True, 'message': 'Vendedor eliminado exitosamente'})
 except Exception as e:
  return jsonify({'success': False, 'message': f'Error al eliminar vendedor: {str(e)}'}), 500
 finally:
  connection.close()

# API para despachos - MODIFICADA PARA USAR DISEÑOS
@app.route('/api/despachos', methods=['GET'])
def get_despachos():
 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   sql = """
    SELECT d.*, c.nombre as cliente_nombre, ch.nombre as chofer_nombre,
           v.nombre as vendedor_nombre, cmn.placa as camion_placa, cmn.modelo as camion_modelo,
           d.hora_llegada, d.received_by, cd.nombre as concrete_design_name
    FROM despachos d
    LEFT JOIN clientes c ON d.cliente_id = c.id
    LEFT JOIN choferes ch ON d.chofer_id = ch.id
    LEFT JOIN vendedores v ON d.vendedor_id = v.id
    LEFT JOIN camiones cmn ON d.camion_id = cmn.id
    LEFT JOIN concrete_designs cd ON d.concrete_design_id = cd.id
    ORDER BY d.fecha DESC, d.guia DESC
   """
   cursor.execute(sql)
   despachos = cursor.fetchall()

  for despacho in despachos:
   if isinstance(despacho['fecha'], (datetime, date)):
    despacho['fecha'] = despacho['fecha'].strftime('%Y-%m-%d')
   
   if isinstance(despacho.get('hora_salida'), timedelta):
    total_seconds = int(despacho['hora_salida'].total_seconds())
    hours, remainder = divmod(total_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    despacho['hora_salida'] = f"{hours:02}:{minutes:02}:{seconds:02}"
   elif despacho.get('hora_salida') is None:
    despacho['hora_salida'] = "N/A"

   if isinstance(despacho.get('hora_llegada'), timedelta):
    total_seconds = int(despacho['hora_llegada'].total_seconds())
    hours, remainder = divmod(total_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    despacho['hora_llegada'] = f"{hours:02}:{minutes:02}:{seconds:02}"
   elif despacho.get('hora_llegada') is None:
    despacho['hora_llegada'] = "N/A"

   despacho['cliente_contacto'] = despacho.get('cliente_nombre')
   despacho['cliente_phone'] = despacho.get('cliente_telefono')

  return jsonify(despachos) # Moved outside the loop
 except Exception as e:
  print(f"Error al obtener despachos: {str(e)}")
  return jsonify({'error': str(e)}), 500
 finally:
  connection.close()

@app.route('/api/despachos', methods=['POST'])
def add_despacho():
 if session.get('user_role') not in ['administrador', 'gerencia', 'vendedor']: # Added 'vendedor' role
  return jsonify({'success': False, 'message': 'Acceso denegado'}), 403

 fecha = request.form.get('fecha')
 m3 = float(request.form.get('m3'))
 diseno_id = request.form.get('diseno')
 cliente_id = request.form.get('cliente')
 chofer_id = request.form.get('chofer')
 vendedor_id = request.form.get('vendedor')
 camion_id = request.form.get('camion')

 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   sql_get_design_name = "SELECT nombre FROM concrete_designs WHERE id = %s"
   cursor.execute(sql_get_design_name, (diseno_id,))
   design_data = cursor.fetchone()
   if not design_data:
    return jsonify({'success': False, 'message': f'Error: Diseño con ID {diseno_id} no válido'}), 400
  diseno_nombre = design_data['nombre']

  try:
   inventario_disenos = calcular_inventario_disenos()
   diseno_info = inventario_disenos.get(int(diseno_id), {})
   
   if diseno_info.get('m3_posibles', 0) < m3:
    return jsonify({'success': False, 'message': f'Error: Inventario insuficiente para {m3} m³ del diseño {diseno_nombre}. Disponible: {diseno_info.get("m3_posibles", 0)} m³'}), 400

  except Exception as e:
   return jsonify({'success': False, 'message': f'Error al verificar inventario: {str(e)}'}), 500

  current_year = datetime.now().year
  guia_prefix = f"GD-{current_year}"

  with connection.cursor() as cursor:
   sql_max_guia = "SELECT guia FROM despachos WHERE guia LIKE %s ORDER BY CAST(SUBSTRING(guia, %s) AS UNSIGNED) DESC LIMIT 1"
   cursor.execute(sql_max_guia, (f"{guia_prefix}%", len(guia_prefix) + 2))
   max_guia_result = cursor.fetchone()
   
   last_sequence_number = 0
   if max_guia_result and max_guia_result['guia']:
    max_guia_number_str = max_guia_result['guia']
    try:
     existing_sequence = int(max_guia_number_str[len(guia_prefix) + 1:])
     last_sequence_number = existing_sequence
    except ValueError:
     print(f"Warning: Non-numeric guia suffix found: {max_guia_number_str}. Starting sequence from default.")

  new_sequence_number = last_sequence_number + 1
  guia = f"{guia_prefix}-{new_sequence_number:05d}"
  
  # Set hora_salida to current time upon registration
  hora_salida = datetime.now().strftime('%H:%M:%S')

  try:
   descuentos = descontar_materiales_inventario(diseno_id, m3)
  except ValueError as e:
   return jsonify({'success': False, 'message': f'Error en inventario: {str(e)}'}), 400
  
  with connection.cursor() as cursor:
   sql = """INSERT INTO despachos (fecha, guia, m3, resistencia, cliente_id, chofer_id, vendedor_id, concrete_design_id, camion_id, status, hora_salida) 
       VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'pending', %s)"""
   cursor.execute(sql, (fecha, guia, m3, diseno_nombre, cliente_id, chofer_id, vendedor_id, diseno_id, camion_id, hora_salida))
   connection.commit()
   
  descuentos_texto = ", ".join([f"{material}: {cantidad:.2f}" for material, cantidad in descuentos.items()])
  return jsonify({'success': True, 'message': f'Despacho registrado exitosamente. Guía: {guia}. Materiales descontados: {descuentos_texto}', 'guia': guia, 'hora_salida': hora_salida})
  
 except Exception as e:
  return jsonify({'success': False, 'message': f'Error al registrar despacho: {str(e)}'}), 500
 finally:
  connection.close()

@app.route('/api/despachos/<int:dispatch_id>', methods=['GET'])
def get_despacho_by_id(dispatch_id):
 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   sql = """
    SELECT d.*, 
           c.nombre as cliente_nombre, c.direccion as cliente_direccion, c.telefono as cliente_telefono, c.documento as cliente_documento,
           ch.nombre as chofer_nombre, ch.cedula as chofer_cedula,
           v.nombre as vendedor_nombre, v.cedula as vendedor_cedula,
           cd.nombre as diseno_nombre, cd.resistencia as diseno_resistencia, cd.asentamiento as diseno_asentamiento,
           cmn.placa as camion_placa, cmn.modelo as camion_modelo,
           d.hora_llegada, d.received_by
    FROM despachos d
    LEFT JOIN clientes c ON d.cliente_id = c.id
    LEFT JOIN choferes ch ON d.chofer_id = ch.id
    LEFT JOIN vendedores v ON d.vendedor_id = v.id
    LEFT JOIN concrete_designs cd ON d.concrete_design_id = cd.id
    LEFT JOIN camiones cmn ON d.camion_id = cmn.id
    WHERE d.id = %s
   """
   cursor.execute(sql, (dispatch_id,))
   despacho = cursor.fetchone()
   
  if despacho:
   if isinstance(despacho['fecha'], (datetime, date)):
    despacho['fecha'] = despacho['fecha'].strftime('%Y-%m-%d')
   
   if isinstance(despacho.get('hora_salida'), timedelta):
    total_seconds = int(despacho['hora_salida'].total_seconds())
    hours, remainder = divmod(total_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    despacho['hora_salida'] = f"{hours:02}:{minutes:02}:{seconds:02}"
   elif despacho.get('hora_salida') is None:
    despacho['hora_salida'] = "N/A"

   if isinstance(despacho.get('hora_llegada'), timedelta):
    total_seconds = int(despacho['hora_llegada'].total_seconds())
    hours, remainder = divmod(total_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    despacho['hora_llegada'] = f"{hours:02}:{minutes:02}:{seconds:02}"
   elif despacho.get('hora_llegada') is None:
    despacho['hora_llegada'] = "N/A"

   despacho['cliente_contacto'] = despacho.get('cliente_nombre')
   despacho['cliente_phone'] = despacho.get('cliente_telefono')

   return jsonify(despacho)
  else:
   return jsonify({"error": "Despacho no encontrado"}), 404
 except Exception as e:
  print(f"Error al obtener despacho por ID: {str(e)}")
  return jsonify({"error": str(e)}), 500
 finally:
  connection.close()

@app.route('/api/despachos/approve/<int:dispatch_id>', methods=['POST'])
def approve_despacho(dispatch_id):
 if session.get('user_role') not in ['administrador', 'gerencia']:
  return jsonify({'success': False, 'message': 'Acceso denegado'}), 403

 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   sql = "UPDATE despachos SET status = 'approved', hora_salida = CURRENT_TIME() WHERE id = %s"
   cursor.execute(sql, (dispatch_id,))
   connection.commit()
  return jsonify({'success': True, 'message': 'Guía de despacho aprobada exitosamente.'})
 except Exception as e:
  connection.rollback()
  print(f"Error al aprobar guía de despacho {dispatch_id}: {str(e)}")
  return jsonify({'success': False, 'message': f'Error al aprobar guía de despacho: {str(e)}'}), 500
 finally:
  connection.close()

@app.route('/api/despachos/deny/<int:dispatch_id>', methods=['POST'])
def deny_despacho(dispatch_id):
 if session.get('user_role') not in ['administrador', 'gerencia']:
  return jsonify({'success': False, 'message': 'Acceso denegado'}), 403

 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   sql = "UPDATE despachos SET status = 'denied' WHERE id = %s"
   cursor.execute(sql, (dispatch_id,))
   connection.commit()
  return jsonify({'success': True, 'message': 'Guía de despacho denegada.'})
 except Exception as e:
  connection.rollback()
  print(f"Error al denegar guía de despacho {dispatch_id}: {str(e)}")
  return jsonify({'success': False, 'message': f'Error al denegar guía de despacho: {str(e)}'}), 500
 finally:
  connection.close()

# API para inventario
@app.route('/api/inventario', methods=['GET'])
def get_inventario():
 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   sql = "SELECT id, nombre, cantidad, unidad, minimo, densidad FROM inventario"
   cursor.execute(sql)
   inventario = cursor.fetchall()
  return jsonify(inventario)
 except Exception as e:
  print(f"Error al obtener inventario: {str(e)}")
  return jsonify({'error': str(e)}), 500
 finally:
  connection.close()

@app.route('/api/inventario', methods=['POST'])
def add_inventario():
 if session.get('user_role') not in ['administrador', 'gerencia', 'control_calidad']:
  return jsonify({'success': False, 'message': 'Acceso denegado'}), 403

 nombre = request.form.get('nombre')
 cantidad = float(request.form.get('cantidad', 0))
 unidad = request.form.get('unidad')
 densidad_str = request.form.get('densidad')

 try:
  densidad = float(densidad_str) if densidad_str else 1.0
  if densidad <= 0:
   densidad = 1.0
 except ValueError:
  densidad = 1.0

 if not all([nombre, unidad]):
  return jsonify({'success': False, 'message': 'Error: Nombre y unidad son obligatorios.'}), 400
 if cantidad < 0:
  return jsonify({'success': False, 'message': 'Error: La cantidad no puede ser negativa.'}), 400

 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   sql = "SELECT id, cantidad FROM inventario WHERE nombre = %s AND unidad = %s"
   cursor.execute(sql, (nombre, unidad))
   material_existente = cursor.fetchone()
   
   if material_existente:
    cantidad_actual = float(material_existente['cantidad'])
    nueva_cantidad = cantidad_actual + cantidad
    sql = "UPDATE inventario SET cantidad = %s WHERE id = %s"
    cursor.execute(sql, (nueva_cantidad, material_existente['id']))
    mensaje = f'Cantidad de {nombre} ({unidad}) actualizada exitosamente'
   else:
    sql = """INSERT INTO inventario (nombre, cantidad, unidad, minimo, densidad)
        VALUES (%s, %s, %s, %s, %s)"""
    cursor.execute(sql, (nombre, cantidad, unidad, 0, densidad))
    mensaje = f'Material {nombre} ({unidad}) registrado exitosamente'
   
   connection.commit()
  return jsonify({'success': True, 'message': mensaje})
 except Exception as e:
  return jsonify({'success': False, 'message': f'Error al registrar material: {str(e)}'}), 500
 finally:
  connection.close()

@app.route('/api/inventario/<int:id>', methods=['POST'])
def update_inventario(id):
 if session.get('user_role') not in ['administrador', 'gerencia', 'control_calidad']:
  return jsonify({'success': False, 'message': 'Acceso denegado'}), 403

 nombre = request.form.get('nombre')
 cantidad = float(request.form.get('cantidad', 0))
 unidad = request.form.get('unidad')
 densidad_str = request.form.get('densidad')

 try:
  densidad = float(densidad_str) if densidad_str else 1.0
  if densidad <= 0:
   densidad = 1.0
 except ValueError:
  densidad = 1.0

 if not all([nombre, unidad]):
  return jsonify({'success': False, 'message': 'Error: Nombre y unidad son obligatorios.'}), 400
 if cantidad < 0:
  return jsonify({'success': False, 'message': 'Error: La cantidad no puede ser negativa.'}), 400

 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   sql_get_current = "SELECT nombre, unidad FROM inventario WHERE id = %s"
   cursor.execute(sql_get_current, (id,))
   item_actual = cursor.fetchone()
   
   if item_actual and (item_actual['nombre'] != nombre or item_actual['unidad'] != unidad):
    sql_check_existing = "SELECT id, cantidad FROM inventario WHERE nombre = %s AND unidad = %s AND id != %s"
    cursor.execute(sql_check_existing, (nombre, unidad, id))
    material_existente = cursor.fetchone()
    
    if material_existente:
     cantidad_actual_existente = float(material_existente['cantidad'])
     nueva_cantidad = cantidad_actual_existente + cantidad
     
     sql_update_existing = "UPDATE inventario SET cantidad = %s WHERE id = %s"
     cursor.execute(sql_update_existing, (nueva_cantidad, material_existente['id']))
     
     sql_delete_current = "DELETE FROM inventario WHERE id = %s"
     cursor.execute(sql_delete_current, (id,))
     
     mensaje = f'Material actualizado y combinado con existente'
    else:
     sql_update_current = """UPDATE inventario SET nombre = %s, cantidad = %s, unidad = %s, densidad = %s
         WHERE id = %s"""
     cursor.execute(sql_update_current, (nombre, cantidad, unidad, densidad, id))
     mensaje = f'Material actualizado exitosamente'
   else:
    sql_update_quantity = """UPDATE inventario SET cantidad = %s, densidad = %s
         WHERE id = %s"""
    cursor.execute(sql_update_quantity, (cantidad, densidad, id))
    mensaje = f'Material actualizado exitosamente'
    
   connection.commit()
  return jsonify({'success': True, 'message': mensaje})
 except Exception as e:
  return jsonify({'success': False, 'message': f'Error al actualizar material: {str(e)}'}), 500
 finally:
  connection.close()

@app.route('/api/inventario/delete/<int:id>', methods=['POST'])
def delete_inventario(id):
 if session.get('user_role') not in ['administrador', 'gerencia']:
  return jsonify({'success': False, 'message': 'Acceso denegado'}), 403

 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   sql = "DELETE FROM inventario WHERE id = %s"
   cursor.execute(sql, (id,))
   connection.commit()
  return jsonify({'success': True, 'message': 'Item de inventario eliminado exitosamente'})
 except Exception as e:
  return jsonify({'success': False, 'message': f'Error al eliminar item de inventario: {str(e)}'}), 500
 finally:
  connection.close()

# API para mantenimiento
@app.route('/api/mantenimiento', methods=['GET'])
def get_mantenimiento():
 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   sql = """
    SELECT m.*, c.placa, c.modelo 
    FROM mantenimiento m
    JOIN camiones c ON m.camion_id = c.id
    ORDER BY m.fecha DESC
   """
   cursor.execute(sql)
   mantenimientos = cursor.fetchall()
  return jsonify(mantenimientos)
 except Exception as e:
  print(f"Error al obtener mantenimientos: {str(e)}")
  return jsonify({'error': str(e)}), 500
 finally:
  connection.close()

@app.route('/api/mantenimiento', methods=['POST'])
def add_mantenimiento():
 if session.get('user_role') not in ['administrador', 'gerencia']:
  return jsonify({'success': False, 'message': 'Acceso denegado'}), 403

 camion_id = request.form.get('camion_id')
 fecha_str = request.form.get('fecha')
 descripcion = request.form.get('descripcion')
 costo = request.form.get('costo')
 tipo_mantenimiento = request.form.get('tipo_mantenimiento')
 kilometraje_actual = request.form.get('kilometraje_actual')

 if not all([camion_id, fecha_str, descripcion, costo, tipo_mantenimiento, kilometraje_actual]):
  return jsonify({'success': False, 'message': 'Todos los campos son obligatorios.'}), 400

 try:
  costo = float(costo)
  if costo < 0:
   return jsonify({'success': False, 'message': 'El costo no puede ser negativo.'}), 400
 except ValueError:
  return jsonify({'success': False, 'message': 'El costo debe ser un número válido.'}), 400

 try:
  kilometraje_actual = int(kilometraje_actual)
  if kilometraje_actual < 0:
   return jsonify({'success': False, 'message': 'El kilometraje actual no puede ser negativo.'}), 400
 except ValueError:
  return jsonify({'success': False, 'message': 'El kilometraje actual debe ser un número entero válido.'}), 400

 try:
  fecha = datetime.strptime(fecha_str, '%Y-%m-%d').date()
 except ValueError:
  return jsonify({'success': False, 'message': 'Formato de fecha inválido. Use YYYY-MM-DD.'}), 400

 proximo_kilometraje_mantenimiento = None
 proxima_fecha_mantenimiento = None
 interval = {}

 if tipo_mantenimiento in MANTENIMIENTO_INTERVALOS:
  interval = MANTENIMIENTO_INTERVALOS[tipo_mantenimiento]
 if interval.get('km'):
  proximo_kilometraje_mantenimiento = kilometraje_actual + interval['km']
 if interval.get('months'):
  proxima_fecha_mantenimiento = fecha + timedelta(days=interval['months'] * 30)

 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   sql = """INSERT INTO mantenimiento (camion_id, fecha, descripcion, costo, tipo_mantenimiento, 
                     kilometraje_actual, proximo_kilometraje_mantenimiento, proxima_fecha_mantenimiento) 
         VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"""
   cursor.execute(sql, (camion_id, fecha, descripcion, costo, tipo_mantenimiento, 
         kilometraje_actual, proximo_kilometraje_mantenimiento, proxima_fecha_mantenimiento))
   
   sql_update_odometer = "UPDATE camiones SET current_odometer = %s WHERE id = %s"
   cursor.execute(sql_update_odometer, (kilometraje_actual, camion_id))

   connection.commit()
  return jsonify({'success': True, 'message': 'Mantenimiento registrado exitosamente'})
 except Exception as e:
  connection.rollback()
  return jsonify({'success': False, 'message': f'Error al registrar mantenimiento: {str(e)}'}), 500
 finally:
  connection.close()

@app.route('/api/mantenimiento/<int:id>', methods=['GET'])
def get_mantenimiento_by_id(id):
 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   sql = "SELECT * FROM mantenimiento WHERE id = %s"
   cursor.execute(sql, (id,))
   mantenimiento = cursor.fetchone()
   
  if mantenimiento:
   mantenimiento_serializable = {
    'id': mantenimiento['id'],
    'camion_id': mantenimiento['camion_id'],
    'fecha': mantenimiento['fecha'].strftime('%Y-%m-%d') if isinstance(mantenimiento['fecha'], (datetime, date)) else None,
    'descripcion': mantenimiento['descripcion'],
    'costo': float(mantenimiento['costo']),
    'tipo_mantenimiento': mantenimiento['tipo_mantenimiento'],
    'kilometraje_actual': mantenimiento['kilometraje_actual'],
    'proximo_kilometraje_mantenimiento': mantenimiento['proximo_kilometraje_mantenimiento'],
    'proxima_fecha_mantenimiento': mantenimiento['proxima_fecha_mantenimiento'].strftime('%Y-%m-%d') if isinstance(mantenimiento['proxima_fecha_mantenimiento'], (datetime, date)) else None
   }
   return jsonify(mantenimiento_serializable)
  else:
   return jsonify({"error": "Mantenimiento no encontrado"}), 404
 except Exception as e:
  print(f"Error al obtener mantenimiento: {str(e)}")
  return jsonify({"error": str(e)}), 500
 finally:
  connection.close()

@app.route('/api/mantenimiento/<int:id>', methods=['POST'])
def update_mantenimiento(id):
 if session.get('user_role') not in ['administrador', 'gerencia']:
  return jsonify({'success': False, 'message': 'Acceso denegado'}), 403

 camion_id = request.form.get('camion_id')
 fecha_str = request.form.get('fecha')
 descripcion = request.form.get('descripcion')
 costo = request.form.get('costo')
 tipo_mantenimiento = request.form.get('tipo_mantenimiento')
 kilometraje_actual = request.form.get('kilometraje_actual')

 if not all([camion_id, fecha_str, descripcion, costo, tipo_mantenimiento, kilometraje_actual]):
  return jsonify({'success': False, 'message': 'Todos los campos son obligatorios.'}), 400

 try:
  costo = float(costo)
  if costo < 0:
   return jsonify({'success': False, 'message': 'El costo no puede ser negativo.'}), 400
 except ValueError:
  return jsonify({'success': False, 'message': 'El costo debe ser un número válido.'}), 400

 try:
  kilometraje_actual = int(kilometraje_actual)
  if kilometraje_actual < 0:
   return jsonify({'success': False, 'message': 'El kilometraje actual no puede ser negativo.'}), 400
 except ValueError:
  return jsonify({'success': False, 'message': 'El kilometraje actual debe ser un número entero válido.'}), 400

 try:
  fecha = datetime.strptime(fecha_str, '%Y-%m-%d').date()
 except ValueError:
  return jsonify({'success': False, 'message': 'Formato de fecha inválido. Use YYYY-MM-DD.'}), 400

 proximo_kilometraje_mantenimiento = None
 proxima_fecha_mantenimiento = None
 interval = {}

 if tipo_mantenimiento in MANTENIMIENTO_INTERVALOS:
  interval = MANTENIMIENTO_INTERVALOS[tipo_mantenimiento]

 if interval.get('km'):
  proximo_kilometraje_mantenimiento = kilometraje_actual + interval['km']
 if interval.get('months'):
  proxima_fecha_mantenimiento = fecha + timedelta(days=interval['months'] * 30)


 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   sql = """UPDATE mantenimiento SET camion_id = %s, fecha = %s, descripcion = %s, costo = %s, 
             tipo_mantenimiento = %s, kilometraje_actual = %s, 
             proximo_kilometraje_mantenimiento = %s, proxima_fecha_mantenimiento = %s 
       WHERE id = %s"""
   cursor.execute(sql, (camion_id, fecha, descripcion, costo, tipo_mantenimiento, 
         kilometraje_actual, proximo_kilometraje_mantenimiento, proxima_fecha_mantenimiento, id))
   
   sql_update_odometer = "UPDATE camiones SET current_odometer = %s WHERE id = %s"
   cursor.execute(sql_update_odometer, (kilometraje_actual, camion_id))

   connection.commit()
  return jsonify({'success': True, 'message': 'Mantenimiento actualizado exitosamente'})
 except Exception as e:
  connection.rollback()
  return jsonify({'success': False, 'message': f'Error al actualizar mantenimiento: {str(e)}'}), 500
 finally:
  connection.close()

@app.route('/api/mantenimiento/delete/<int:id>', methods=['POST'])
def delete_mantenimiento(id):
 if session.get('user_role') not in ['administrador', 'gerencia']:
  return jsonify({'success': False, 'message': 'Acceso denegado'}), 403

 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   sql = "DELETE FROM mantenimiento WHERE id = %s"
   cursor.execute(sql, (id,))
   connection.commit()
  return jsonify({'success': True, 'message': 'Mantenimiento eliminado exitosamente'})
 except Exception as e:
  connection.rollback()
  return jsonify({'success': False, 'message': f'Error al eliminar mantenimiento: {str(e)}'}), 500
 finally:
  connection.close()

# API para alertas de inventario (now based on designs)
@app.route('/api/alertas/inventario', methods=['GET'])
def get_alertas_inventario():
 alertas_disenos = generar_alertas_disenos()
 return jsonify(alertas_disenos)

# API para alertas de vencimientos
@app.route('/api/alertas/vencimientos', methods=['GET'])
def get_alertas_vencimientos():
 hoy = datetime.now().date()
 limite = hoy + timedelta(days=30)

 connection = get_db_connection()
 alertas = []

 try:
  with connection.cursor() as cursor:
   sql = "SELECT id, nombre, vencimiento_licencia FROM choferes WHERE vencimiento_licencia <= %s"
   cursor.execute(sql, (limite,))
   licencias = cursor.fetchall()
   for licencia in licencias:
    dias_restantes = (licencia['vencimiento_licencia'] - hoy).days
    alertas.append({
     'tipo': 'licencia',
     'chofer_id': licencia['id'],
     'chofer_nombre': licencia['nombre'],
     'fecha_vencimiento': licencia['vencimiento_licencia'].strftime('%Y-%m-%d'),
     'dias_restantes': dias_restantes,
     'nivel': 'crítico' if dias_restantes <= 7 else 'advertencia'
    })

  with connection.cursor() as cursor:
   sql = "SELECT id, nombre, vencimiento_certificado FROM choferes WHERE vencimiento_certificado <= %s"
   cursor.execute(sql, (limite,))
   certificados = cursor.fetchall()
   for certificado in certificados:
    dias_restantes = (certificado['vencimiento_certificado'] - hoy).days
    alertas.append({
     'tipo': 'certificado_medico',
     'chofer_id': certificado['id'],
     'chofer_nombre': certificado['nombre'],
     'fecha_vencimiento': certificado['vencimiento_certificado'].strftime('%Y-%m-%d'),
     'dias_restantes': dias_restantes,
     'nivel': 'crítico' if dias_restantes <= 7 else 'advertencia'
    })
  return jsonify(alertas)
 except Exception as e:
  print(f"Error al obtener alertas de vencimientos: {str(e)}")
  return jsonify({'error': str(e)}), 500
 finally:
  connection.close()

# API for Purchase Orders (Guía de Compra)
@app.route('/api/purchase_orders', methods=['POST'])
def add_purchase_order():
 if session.get('user_role') not in ['administrador', 'gerencia']:
  return jsonify({'success': False, 'message': 'Acceso denegado'}), 403

 data = request.json

 current_year = datetime.now().year
 po_prefix = f"{current_year}"

 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   sql_max_po = "SELECT po_number FROM purchase_orders WHERE po_number LIKE %s ORDER BY CAST(SUBSTRING(po_number, %s) AS UNSIGNED) DESC LIMIT 1"
   cursor.execute(sql_max_po, (f"{po_prefix}%", len(po_prefix) + 1))
   max_po_result = cursor.fetchone()
   
   last_sequence_number = 2000
   if max_po_result and max_po_result['po_number']:
    max_po_number_str = max_po_result['po_number']
    try:
     existing_sequence = int(max_po_number_str[len(po_prefix):])
     if existing_sequence >= last_sequence_number:
      last_sequence_number = existing_sequence
    except ValueError:
     print(f"Warning: Non-numeric PO suffix found for proveedores: {max_po_number_str}. Starting sequence from default.")

   new_sequence_number = last_sequence_number + 1

   po_number = f"{po_prefix}{new_sequence_number:06d}"

   client_name = data.get('client_name')
   client_address = data.get('client_address')
   client_rif = data.get('client_rif')
   client_contact = data.get('client_contact')
   client_phone = data.get('client_phone')
   items = data.get('items', [])
   subtotal = data.get('subtotal')
   exempt = data.get('exempt')
   taxable_base = data.get('taxable_base')
   iva_rate = data.get('iva_rate')
   iva_amount = data.get('iva_amount')
   total_to_pay = data.get('total_to_pay')
   igtf_rate = data.get('igtf_rate')
   igtf_amount = data.get('igtf_amount')

   print(f"DEBUG: Datos de la guía de compra recibidos:")
   print(f"  Subtotal: {subtotal}")
   print(f"  Exempt: {exempt}")
   print(f"  Taxable Base: {taxable_base}")
   print(f"  IVA Rate: {iva_rate}")
   print(f"  IVA Amount: {iva_amount}")
   print(f"  Total to Pay: {total_to_pay}")
   print(f"  IGTF Rate: {igtf_rate}")
   print(f"  IGTF Amount: {igtf_amount}")

   if not all([po_number, client_name, client_rif, items, subtotal is not None, total_to_pay is not None]):
    return jsonify({'success': False, 'message': 'Faltan datos obligatorios para la guía de compra.'}), 400
   if not items:
    return jsonify({'success': False, 'message': 'La guía de compra debe tener al menos un item.'}), 400

   sql_po = """
    INSERT INTO purchase_orders (
     po_number, client_name, client_address, client_rif, 
     client_contact, client_phone, subtotal, exempt, taxable_base, 
     iva_rate, iva_amount, total_to_pay, igtf_rate, igtf_amount, 
     created_at, created_by_user_id
    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), %s)
   """
   cursor.execute(sql_po, (
    po_number, client_name, client_address, client_rif, 
    client_contact, client_phone, subtotal, exempt, taxable_base, 
    iva_rate, iva_amount, total_to_pay, igtf_rate, igtf_amount, 
    session.get('user_id')
   ))
   purchase_order_id = cursor.lastrowid

   sql_item = """
    INSERT INTO purchase_order_items (
     purchase_order_id, code, description, quantity, unit_price, item_total
    ) VALUES (%s, %s, %s, %s, %s, %s)
   """
   for item in items:
    cursor.execute(sql_item, (
     purchase_order_id, item['code'], item['description'], 
     item['quantity'], item['unitPrice'], item['itemTotal']
    ))
   
   connection.commit()
  return jsonify({'success': True, 'message': 'Guía de Compra generada y registrada exitosamente.', 'po_number': po_number, 'order_id': purchase_order_id})
 except Exception as e:
  connection.rollback()
  print(f"Error adding purchase order: {str(e)}")
  return jsonify({'success': False, 'message': f'Error al registrar la guía de compra: {str(e)}'}), 500
 finally:
  connection.close()

@app.route('/api/purchase_orders/list', methods=['GET'])
def list_purchase_orders():
 if session.get('user_role') not in ['administrador', 'gerencia']:
  return jsonify({'success': False, 'message': 'Acceso denegado'}), 403

 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   sql = "SELECT id, po_number, created_at, client_name, client_rif, total_to_pay FROM purchase_orders ORDER BY created_at DESC, created_at DESC"
   cursor.execute(sql)
   orders = cursor.fetchall()
  return jsonify(orders)
 except Exception as e:
  print(f"Error listing purchase orders: {str(e)}")
  return jsonify({'success': False, 'message': f'Error al listar guías de compra: {str(e)}'}), 500
 finally:
  connection.close()

@app.route('/api/purchase_orders/<int:order_id>', methods=['GET'])
def get_purchase_order(order_id):
 if session.get('user_role') not in ['administrador', 'gerencia']:
  return jsonify({'success': False, 'message': 'Acceso denegado'}), 403

 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   sql_po = "SELECT * FROM purchase_orders WHERE id = %s"
   cursor.execute(sql_po, (order_id,))
   order = cursor.fetchone()

   if not order:
    return jsonify({'success': False, 'message': 'Guía de compra no encontrada'}), 404

   sql_items = "SELECT code, description, quantity, unit_price, item_total FROM purchase_order_items WHERE purchase_order_id = %s"
   cursor.execute(sql_items, (order_id,))
   items = cursor.fetchall()
   
   order['items'] = items
   if isinstance(order['created_at'], datetime):
    order['created_at'] = order['created_at'].strftime('%Y-%m-%d %H:%M:%S')
   if 'date' in order:
    del order['date']

  return jsonify(order)
 except Exception as e:
  print(f"Error getting purchase order {order_id}: {str(e)}")
  return jsonify({'success': False, 'message': f'Error al obtener guía de compra: {str(e)}'}), 500
 finally:
  connection.close()

@app.route('/api/purchase_orders/delete/<int:order_id>', methods=['POST'])
def delete_purchase_order(order_id):
 if session.get('user_role') not in ['administrador', 'gerencia']:
  return jsonify({'success': False, 'message': 'Acceso denegado'}), 403

 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   sql_delete_items = "DELETE FROM purchase_order_items WHERE purchase_order_id = %s"
   cursor.execute(sql_delete_items, (order_id,))
   
   sql_delete_po = "DELETE FROM purchase_orders WHERE id = %s"
   cursor.execute(sql_delete_po, (order_id,))
   connection.commit()
  return jsonify({'success': True, 'message': 'Guía de compra eliminada exitosamente.'})
 except Exception as e:
  connection.rollback()
  print(f"Error deleting purchase order {order_id}: {str(e)}")
  return jsonify({'success': False, 'message': f'Error al eliminar guía de compra: {str(e)}'}), 500
 finally:
  connection.close()

# API for Quotations
@app.route('/api/quotations', methods=['POST'])
def add_quotation():
    if session.get('user_role') != 'vendedor':
        return jsonify({'success': False, 'message': 'Acceso denegado'}), 403

    data = request.json
    
    quotation_date = data.get('quotation_date')
    client_id = data.get('client_id')
    seller_id = data.get('seller_id')
    validity_days = data.get('validity_days')
    notes = data.get('notes')
    items = data.get('items', [])
    subtotal = data.get('subtotal')
    exempt_amount = data.get('exempt_amount', 0.00)
    taxable_base = data.get('taxable_base')
    iva_rate = data.get('iva_rate')
    iva_amount = data.get('iva_amount')
    total_amount = data.get('total_amount')
    bank_details = data.get('bank_details')
    observation = data.get('observation')

    if not all([quotation_date, client_id, seller_id, validity_days, items,
                subtotal is not None, taxable_base is not None, iva_rate is not None,
                iva_amount is not None, total_amount is not None, bank_details, observation]):
        return jsonify({'success': False, 'message': 'Faltan datos obligatorios para la cotización.'}), 400
    if not items:
        return jsonify({'success': False, 'message': 'La cotización debe tener al menos un item.'}), 400

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            # Fetch client details
            sql_client = "SELECT nombre, direccion, documento, telefono FROM clientes WHERE id = %s"
            cursor.execute(sql_client, (client_id,))
            client_data = cursor.fetchone()
            if not client_data:
                return jsonify({'success': False, 'message': 'Cliente no encontrado.'}), 404

            # Fetch seller details
            sql_seller = "SELECT nombre FROM vendedores WHERE id = %s"
            cursor.execute(sql_seller, (seller_id,))
            seller_data = cursor.fetchone()
            if not seller_data:
                return jsonify({'success': False, 'message': 'Vendedor no encontrado.'}), 404

            # Generate quotation number: Nº[5-digit sequence][4-digit year]
            current_year = datetime.now().year
            quotation_prefix = f"Nº"

            sql_max_quotation = "SELECT quotation_number FROM cotizacion WHERE quotation_number LIKE %s ORDER BY CAST(SUBSTRING(quotation_number, 3, 5) AS UNSIGNED) DESC LIMIT 1"
            cursor.execute(sql_max_quotation, (f"{quotation_prefix}%{current_year}",))
            max_quotation_result = cursor.fetchone()
            
            last_sequence_number = 0
            if max_quotation_result and max_quotation_result['quotation_number']:
                max_quotation_number_str = max_quotation_result['quotation_number']
                try:
                    # Extract the 5-digit sequence part
                    existing_sequence = int(max_quotation_number_str[2:7])
                    last_sequence_number = existing_sequence
                except ValueError:
                    print(f"Warning: Non-numeric quotation suffix found: {max_quotation_number_str}. Starting sequence from default.")

            new_sequence_number = last_sequence_number + 1
            quotation_number = f"{quotation_prefix}{new_sequence_number:05d}{current_year}"

            # Insert into quotations table
            sql_quotation = """
                INSERT INTO cotizacion (
                    quotation_number, quotation_date, client_id, client_name, client_address, client_rif, client_phone,
                    seller_id, seller_name, validity_days, notes, subtotal, exempt_amount, taxable_base,
                    iva_rate, iva_amount, total_amount, bank_details, observation, created_by_user_id, status
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'active')
            """
            cursor.execute(sql_quotation, (
                quotation_number, quotation_date, client_id, client_data['nombre'], client_data['direccion'],
                client_data['documento'], client_data['telefono'], seller_id, seller_data['nombre'],
                validity_days, notes, subtotal, exempt_amount, taxable_base,
                iva_rate, iva_amount, total_amount, bank_details, observation, session.get('user_id')
            ))
            quotation_id = cursor.lastrowid

            # Insert items into quotation_items table
            sql_item = """
                INSERT INTO cotizacion_items (
                    quotation_id, code, description, quantity, unit_price, item_total
                ) VALUES (%s, %s, %s, %s, %s, %s)
            """
            for item in items:
                item_type = item.get('item_type')
                item_db_id = item.get('item_id') # This is the ID from concrete_designs or services table
                item_code = item.get('code') # This is the code string like '0000021' or '0000049'
                item_description = ""
                item_unit_price = item['unit_price'] # Use price from frontend for flexibility

                if item_type == 'concrete_design':
                    design_full_data = get_concrete_design_by_id_internal(item_db_id)
                    if not design_full_data:
                        connection.rollback()
                        return jsonify({'success': False, 'message': f'Diseño de concreto con ID {item_db_id} no encontrado.'}), 400
                    
                    # Construct description for concrete design, including days if provided
                    days = item.get('days')
                    if days:
                        item_description = f"RC = {design_full_data['nombre']} ADTVO SUPER PLASTIFICANTE WRDA79 FRACTIL 10% A LOS {days} DIAS"
                    else:
                        item_description = f"RC = {design_full_data['nombre']} ADTVO SUPER PLASTIFICANTE WRDA79 FRACTIL 10%"

                elif item_type == 'service':
                    service_data = get_service_by_id(item_db_id)
                    if not service_data:
                        connection.rollback()
                        return jsonify({'success': False, 'message': f'Servicio con ID {item_db_id} no encontrado.'}), 400
                    item_description = service_data['description']
                    # For services, the 'days' field is not applicable, so it's ignored.

                else:
                    connection.rollback()
                    return jsonify({'success': False, 'message': 'Tipo de item de cotización inválido.'}), 400

                cursor.execute(sql_item, (
                    quotation_id, item_code, item_description, item['quantity'], item_unit_price, item['item_total']
                ))
            
            connection.commit()
        return jsonify({'success': True, 'message': 'Cotización registrada exitosamente.', 'quotation_number': quotation_number, 'quotation_id': quotation_id})
    except Exception as e:
        connection.rollback()
        print(f"Error adding quotation: {str(e)}")
        return jsonify({'success': False, 'message': f'Error al registrar la cotización: {str(e)}'}), 500
    finally:
        connection.close()

@app.route('/api/quotations/list', methods=['GET'])
def list_quotations():
    if session.get('user_role') not in ['administrador', 'gerencia', 'vendedor']:
        return jsonify({'success': False, 'message': 'Acceso denegado'}), 403

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            # SQL query to get quotation summary including first item description and total quantity
            sql = """
                SELECT
                    c.id,
                    c.quotation_number,
                    c.quotation_date,
                    c.client_name,
                    c.seller_name,
                    c.total_amount,
                    c.validity_days,
                    c.notes,
                    c.status,
                    SUM(ci.quantity) AS total_quantity,
                    CASE
                        WHEN COUNT(ci.id) = 1 THEN MAX(ci.description)
                        ELSE 'Múltiples ítems'
                    END AS item_summary_description
                FROM
                    cotizacion c
                LEFT JOIN
                    cotizacion_items ci ON c.id = ci.quotation_id
                GROUP BY
                    c.id, c.quotation_number, c.quotation_date, c.client_name, c.seller_name, c.total_amount, c.validity_days, c.notes, c.status
                ORDER BY
                    c.quotation_date DESC, c.quotation_number DESC
            """
            cursor.execute(sql)
            quotations = cursor.fetchall()

            # Convert date objects to string for JSON serialization
            for q in quotations:
                if isinstance(q['quotation_date'], (datetime, date)):
                    q['quotation_date'] = q['quotation_date'].strftime('%Y-%m-%d')
                # Calculate expiration date on backend for consistency, or leave to frontend
                # For now, let's calculate it on the frontend as per original plan.
        return jsonify(quotations)
    except Exception as e:
        print(f"Error listing cotizacion: {str(e)}")
        return jsonify({'success': False, 'message': f'Error al listar cotizaciones: {str(e)}'}), 500
    finally:
        connection.close()

@app.route('/api/quotations/<int:quotation_id>', methods=['GET'])
def get_quotation_by_id(quotation_id):
    if session.get('user_role') not in ['administrador', 'gerencia', 'vendedor']:
        return jsonify({'success': False, 'message': 'Acceso denegado'}), 403

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            sql_quotation = "SELECT * FROM cotizacion WHERE id = %s"
            cursor.execute(sql_quotation, (quotation_id,))
            quotation = cursor.fetchone()

            if not quotation:
                return jsonify({'success': False, 'message': 'Cotización no encontrada'}), 404

            sql_items = "SELECT code, description, quantity, unit_price, item_total FROM cotizacion_items WHERE quotation_id = %s"
            cursor.execute(sql_items, (quotation_id,))
            items = cursor.fetchall()
            
            quotation['items'] = items
            if isinstance(quotation['quotation_date'], (datetime, date)):
                quotation['quotation_date'] = quotation['quotation_date'].strftime('%Y-%m-%d')
            if isinstance(quotation['created_at'], datetime):
                quotation['created_at'] = quotation['created_at'].strftime('%Y-%m-%d %H:%M:%S')

        return jsonify(quotation)
    except Exception as e:
        print(f"Error getting quotation {quotation_id}: {str(e)}")
        return jsonify({'success': False, 'message': f'Error al obtener cotización: {str(e)}'}), 500
    finally:
        connection.close()

@app.route('/api/quotations/cancel/<int:quotation_id>', methods=['POST'])
def cancel_quotation(quotation_id):
    if session.get('user_role') not in ['administrador', 'gerencia', 'vendedor']:
        return jsonify({'success': False, 'message': 'Acceso denegado'}), 403

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            # Check if the quotation exists and is not already cancelled
            sql_check = "SELECT status FROM cotizacion WHERE id = %s"
            cursor.execute(sql_check, (quotation_id,))
            quotation = cursor.fetchone()
            if not quotation:
                return jsonify({'success': False, 'message': 'Cotización no encontrada.'}), 404
            if quotation['status'] == 'cancelled':
                return jsonify({'success': False, 'message': 'La cotización ya está anulada.'}), 400

            sql = "UPDATE cotizacion SET status = 'cancelled' WHERE id = %s"
            cursor.execute(sql, (quotation_id,))
            connection.commit()
        return jsonify({'success': True, 'message': 'Cotización anulada exitosamente.'})
    except Exception as e:
        connection.rollback()
        print(f"Error al anular cotización {quotation_id}: {str(e)}")
        return jsonify({'success': False, 'message': f'Error al anular cotización: {str(e)}'}), 500
    finally:
        connection.close()

# New route to serve user photos
@app.route('/static/uploads/<path:filename>')
def serve_uploads(filename):
 full_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
 print(f"DEBUG: serve_uploads - Attempting to serve: {full_path}")
 if not os.path.exists(full_path):
  print(f"ERROR: serve_uploads - File not found at: {full_path}")
 return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# --- API para Proveedores ---
@app.route('/api/proveedores', methods=['GET'])
def get_proveedores():
 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   sql = "SELECT * FROM proveedores"
   cursor.execute(sql)
   proveedores = cursor.fetchall()

   for proveedor in proveedores:
    sql_materiales = "SELECT id, nombre_material, precio, unidad_medida FROM materiales_proveedor WHERE proveedor_id = %s"
    cursor.execute(sql_materiales, (proveedor['id'],))
    proveedor['materiales'] = cursor.fetchall()

  return jsonify(proveedores)
 except Exception as e:
  print(f"Error al obtener proveedores: {str(e)}")
  return jsonify({'success': False, 'message': f'Error al obtener proveedores: {str(e)}'}), 500
 finally:
  connection.close()


# Update the add_proveedor route
@app.route('/api/proveedores', methods=['POST'])
def add_proveedor():
  if session.get('user_role') not in ['administrador', 'gerencia']:
    return jsonify({'success': False, 'message': 'Acceso denegado'}), 403

  nombre = request.form.get('nombre')
  rif_type = request.form.get('rif_type')
  rif_number = request.form.get('rif_number')
  direccion = request.form.get('direccion')
  telefono = request.form.get('telefono')
  email = request.form.get('email')
  nombre_contacto = request.form.get('nombre_contacto')
  telefono_contacto = request.form.get('telefono_contacto')

  rif = f"{rif_type}-{rif_number}"

  materiales_json = request.form.get('materiales')
  try:
    materiales = json.loads(materiales_json) if materiales_json else []
  except json.JSONDecodeError:
    print(f"ERROR: JSONDecodeError for materiales: {materiales_json}")
    return jsonify({'success': False, 'message': 'Formato de materiales inválido.'}), 400

  # Validate fields
  is_valid_name, name_message = validate_name(nombre)
  if not is_valid_name:
    return jsonify({'success': False, 'message': name_message}), 400

  is_valid_rif, rif_message = validate_venezuelan_rif(rif)
  if not is_valid_rif:
    print(f"DEBUG: RIF validation failed: {rif_message}")
    return jsonify({'success': False, 'message': rif_message}), 400

  is_valid_address, address_message = validate_address(direccion)
  if not is_valid_address:
    return jsonify({'success': False, 'message': address_message}), 400

  is_valid_phone, phone_message = validate_phone(telefono)
  if not is_valid_phone:
    return jsonify({'success': False, 'message': phone_message}), 400

  is_valid_email, email_message = validate_email(email)
  if not is_valid_email:
    return jsonify({'success': False, 'message': email_message}), 400

  connection = get_db_connection()
  try:
    with connection.cursor() as cursor:
      sql_check_rif = "SELECT id FROM proveedores WHERE rif = %s"
      cursor.execute(sql_check_rif, (rif,))
      if cursor.fetchone():
        return jsonify({'success': False, 'message': f'Error: El RIF {rif} ya está registrado para otro proveedor.'}), 409

      sql = """INSERT INTO proveedores (nombre, rif, direccion, telefono, email, nombre_contacto, telefono_contacto)
          VALUES (%s, %s, %s, %s, %s, %s, %s)"""
      cursor.execute(sql, (nombre, rif, direccion, telefono, email, nombre_contacto, telefono_contacto))
      proveedor_id = cursor.lastrowid

      sql_material = """INSERT INTO materiales_proveedor (proveedor_id, nombre_material, precio, unidad_medida)
          VALUES (%s, %s, %s, %s)"""
      for material in materiales:
        if not all([material.get('nombre_material'), material.get('precio') is not None, material.get('unidad_medida')]):
          connection.rollback()
          return jsonify({'success': False, 'message': 'Todos los campos de material (nombre, precio, unidad) son obligatorios.'}), 400
        if not isinstance(material.get('precio'), (int, float)) or material.get('precio') < 0:
          connection.rollback()
          return jsonify({'success': False, 'message': 'El precio del material debe ser un número no negativo.'}), 400
        cursor.execute(sql_material, (proveedor_id, material['nombre_material'], material['precio'], material['unidad_medida']))
    
    connection.commit()
    return jsonify({'success': True, 'message': 'Proveedor registrado exitosamente.'})
  except Exception as e:
    connection.rollback()
    print(f"Error al registrar proveedor: {str(e)}")
    return jsonify({'success': False, 'message': f'Error al registrar proveedor: {str(e)}'}), 500
  finally:
    connection.close()

@app.route('/api/proveedores/<int:id>', methods=['GET'])
def get_proveedor_by_id(id):
 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   sql = "SELECT * FROM proveedores WHERE id = %s"
   cursor.execute(sql, (id,))
   proveedor = cursor.fetchone()

   if not proveedor:
    return jsonify({'success': False, 'message': 'Proveedor no encontrado'}), 404

   sql_materiales = "SELECT id, nombre_material, precio, unidad_medida FROM materiales_proveedor WHERE proveedor_id = %s"
   cursor.execute(sql_materiales, (id,))
   proveedor['materiales'] = cursor.fetchall()

  return jsonify(proveedor)
 except Exception as e:
  print(f"Error al obtener proveedor por ID: {str(e)}")
  return jsonify({'success': False, 'message': f'Error al obtener proveedor: {str(e)}'}), 500
 finally:
  connection.close()

@app.route('/api/proveedores/<int:id>', methods=['POST'])
def update_proveedor(id):
  if session.get('user_role') not in ['administrador', 'gerencia']:
    return jsonify({'success': False, 'message': 'Acceso denegado'}), 403

  nombre = request.form.get('nombre')
  rif_type = request.form.get('rif_type')
  rif_number = request.form.get('rif_number')
  direccion = request.form.get('direccion')
  telefono = request.form.get('telefono')
  email = request.form.get('email')
  nombre_contacto = request.form.get('nombre_contacto')
  telefono_contacto = request.form.get('telefono_contacto')

  rif = f"{rif_type}-{rif_number}"

  materiales_json = request.form.get('materiales')
  try:
    materiales = json.loads(materiales_json) if materiales_json else []
  except json.JSONDecodeError:
    print(f"ERROR: JSONDecodeError for materiales: {materiales_json}")
    return jsonify({'success': False, 'message': 'Formato de materiales inválido.'}), 400

  # Validate fields
  is_valid_name, name_message = validate_name(nombre)
  if not is_valid_name:
    return jsonify({'success': False, 'message': name_message}), 400

  is_valid_rif, rif_message = validate_venezuelan_rif(rif)
  if not is_valid_rif:
    print(f"DEBUG: RIF validation failed: {rif_message}")
    return jsonify({'success': False, 'message': rif_message}), 400

  is_valid_address, address_message = validate_address(direccion)
  if not is_valid_address:
    return jsonify({'success': False, 'message': address_message}), 400

  is_valid_phone, phone_message = validate_phone(telefono)
  if not is_valid_phone:
    return jsonify({'success': False, 'message': phone_message}), 400

  is_valid_email, email_message = validate_email(email)
  if not is_valid_email:
    return jsonify({'success': False, 'message': email_message}), 400

  connection = get_db_connection()
  try:
    with connection.cursor() as cursor:
      sql_check_rif = "SELECT id FROM proveedores WHERE rif = %s AND id != %s"
      cursor.execute(sql_check_rif, (rif, id))
      if cursor.fetchone():
        return jsonify({'success': False, 'message': f'Error: El RIF {rif} ya está registrado para otro proveedor.'}), 409

      sql_update_proveedor = """UPDATE proveedores SET nombre = %s, rif = %s, direccion = %s, telefono = %s, email = %s,
                                  nombre_contacto = %s, telefono_contacto = %s WHERE id = %s"""
      cursor.execute(sql_update_proveedor, (nombre, rif, direccion, telefono, email, nombre_contacto, telefono_contacto, id))

      # Delete existing materials for this supplier
      sql_delete_materials = "DELETE FROM materiales_proveedor WHERE proveedor_id = %s"
      cursor.execute(sql_delete_materials, (id,))

      # Insert new materials
      sql_insert_material = """INSERT INTO materiales_proveedor (proveedor_id, nombre_material, precio, unidad_medida)
                               VALUES (%s, %s, %s, %s)"""
      for material in materiales:
        if not all([material.get('nombre_material'), material.get('precio') is not None, material.get('unidad_medida')]):
          connection.rollback()
          return jsonify({'success': False, 'message': 'Todos los campos de material (nombre, precio, unidad) son obligatorios.'}), 400
        if not isinstance(material.get('precio'), (int, float)) or material.get('precio') < 0:
          connection.rollback()
          return jsonify({'success': False, 'message': 'El precio del material debe ser un número no negativo.'}), 400
        cursor.execute(sql_insert_material, (id, material['nombre_material'], material['precio'], material['unidad_medida']))
    
    connection.commit()
    return jsonify({'success': True, 'message': 'Proveedor actualizado exitosamente.'})
  except Exception as e:
    connection.rollback()
    print(f"Error al actualizar proveedor: {str(e)}")
    return jsonify({'success': False, 'message': f'Error al actualizar proveedor: {str(e)}'}), 500
  finally:
    connection.close()

@app.route('/api/proveedores/delete/<int:id>', methods=['POST'])
def delete_proveedor(id):
 if session.get('user_role') not in ['administrador', 'gerencia']:
  return jsonify({'success': False, 'message': 'Acceso denegado'}), 403

 connection = get_db_connection()
 try:
  with connection.cursor() as cursor:
   # Check for associated purchase orders
   sql_check_po = "SELECT COUNT(*) as count FROM purchase_orders WHERE client_rif IN (SELECT rif FROM proveedores WHERE id = %s)"
   cursor.execute(sql_check_po, (id,))
   if cursor.fetchone()['count'] > 0:
    return jsonify({'success': False, 'message': 'No se puede eliminar el proveedor porque tiene guías de compra asociadas.'}), 400

   # Delete associated materials first
   sql_delete_materials = "DELETE FROM materiales_proveedor WHERE proveedor_id = %s"
   cursor.execute(sql_delete_materials, (id,))

   sql_delete_proveedor = "DELETE FROM proveedores WHERE id = %s"
   cursor.execute(sql_delete_proveedor, (id,))
   connection.commit()
  return jsonify({'success': True, 'message': 'Proveedor eliminado exitosamente.'})
 except Exception as e:
  connection.rollback()
  print(f"Error al eliminar proveedor: {str(e)}")
  return jsonify({'success': False, 'message': f'Error al eliminar proveedor: {str(e)}'}), 500
 finally:
  connection.close()

# --- API para Órdenes de Compra (Proveedores) ---
@app.route('/api/ordenes_compra_proveedor', methods=['POST'])
def add_orden_compra_proveedor():
    if session.get('user_role') not in ['administrador', 'gerencia']:
        return jsonify({'success': False, 'message': 'Acceso denegado'}), 403

    data = request.json
    proveedor_id = data.get('proveedor_id')
    fecha = data.get('fecha')
    items = data.get('items', [])
    total = data.get('total')

    if not all([proveedor_id, fecha, items, total is not None]):
        return jsonify({'success': False, 'message': 'Faltan datos obligatorios para la orden de compra.'}), 400
    if not items:
        return jsonify({'success': False, 'message': 'La orden de compra debe tener al menos un item.'}), 400

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            # Generate PO Number for proveedores
            current_year = datetime.now().year
            po_prefix = f"OC{current_year}" # e.g., "OC2024"
            
            sql_max_po = "SELECT po_number FROM ordenes_compra_proveedor WHERE po_number LIKE %s ORDER BY CAST(SUBSTRING(po_number, %s) AS UNSIGNED) DESC LIMIT 1"
            cursor.execute(sql_max_po, (f"{po_prefix}%", len(po_prefix) + 1))
            max_po_result = cursor.fetchone()
            
            last_sequence_number = 0 # Start from 0 for new sequence
            if max_po_result and max_po_result['po_number']:
                max_po_number_str = max_po_result['po_number']
                try:
                    existing_sequence = int(max_po_number_str[len(po_prefix):])
                    last_sequence_number = existing_sequence
                except ValueError:
                    print(f"Warning: Non-numeric PO suffix found for proveedores: {max_po_number_str}. Starting sequence from default.")

            new_sequence_number = last_sequence_number + 1
            po_number = f"{po_prefix}{new_sequence_number:06d}" # Pad with leading zeros to 6 digits

            sql_oc = """
                INSERT INTO ordenes_compra_proveedor (
                    po_number, proveedor_id, fecha, total, created_by_user_id, status
                ) VALUES (%s, %s, %s, %s, %s, %s)
            """
            cursor.execute(sql_oc, (
                po_number, proveedor_id, fecha, total, session.get('user_id'), 'pending'
            ))
            orden_compra_id = cursor.lastrowid

            sql_item = """
                INSERT INTO detalles_orden_compra_proveedor (
                    orden_compra_id, material_proveedor_id, cantidad, precio_unitario, subtotal_item
                ) VALUES (%s, %s, %s, %s, %s)
            """
            for item in items:
                cursor.execute(sql_item, (
                    orden_compra_id, item['material_id'], item['cantidad'], item['precio_unitario'], item['subtotal_item']
                ))
            
            connection.commit()
        return jsonify({'success': True, 'message': 'Orden de Compra generada y registrada exitosamente.', 'po_number': po_number, 'order_id': orden_compra_id})
    except Exception as e:
        connection.rollback()
        print(f"Error al añadir orden de compra: {str(e)}")
        return jsonify({'success': False, 'message': f'Error al registrar la orden de compra: {str(e)}'}), 500
    finally:
        connection.close()

@app.route('/api/ordenes_compra_proveedor/list', methods=['GET'])
def list_ordenes_compra_proveedor():
    if session.get('user_role') not in ['administrador', 'gerencia']:
        return jsonify({'success': False, 'message': 'Acceso denegado'}), 403

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            sql = """
                SELECT o.id, o.po_number, o.fecha, p.nombre as proveedor_nombre, o.total, o.status
                FROM ordenes_compra_proveedor o
                JOIN proveedores p ON o.proveedor_id = p.id
                ORDER BY o.fecha DESC, o.po_number DESC
            """
            cursor.execute(sql)
            orders = cursor.fetchall()
        return jsonify(orders)
    except Exception as e:
        print(f"Error al listar órdenes de compra: {str(e)}")
        return jsonify({'success': False, 'message': f'Error al listar órdenes de compra: {str(e)}'}), 500
    finally:
        connection.close() # Ensure connection is closed

@app.route('/api/ordenes_compra_proveedor/<int:order_id>', methods=['GET'])
def get_orden_compra_proveedor(order_id):
    if session.get('user_role') not in ['administrador', 'gerencia']:
        return jsonify({'success': False, 'message': 'Acceso denegado'}), 403

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            sql_oc = """
                SELECT o.*, p.nombre as proveedor_nombre, p.rif as proveedor_rif, o.status,
                        p.direccion as proveedor_direccion, p.telefono as proveedor_telefono, p.email as proveedor_email,
                        p.nombre_contacto as proveedor_nombre_contacto, p.telefono_contacto as proveedor_telefono_contacto
                FROM ordenes_compra_proveedor o
                JOIN proveedores p ON o.proveedor_id = p.id
                WHERE o.id = %s
            """ # Corrected alias for proveedor_direccion, proveedor_telefono, proveedor_email
            cursor.execute(sql_oc, (order_id,))
            order = cursor.fetchone()

            if not order:
                return jsonify({'success': False, 'message': 'Orden de compra no encontrada'}), 404

            sql_items = """
                SELECT d.material_proveedor_id, d.cantidad, d.precio_unitario, d.subtotal_item, 
                        mp.nombre_material, mp.unidad_medida
                FROM detalles_orden_compra_proveedor d
                JOIN materiales_proveedor mp ON d.material_proveedor_id = mp.id
                WHERE d.orden_compra_id = %s
            """
            cursor.execute(sql_items, (order_id,))
            items = cursor.fetchall()
            
            order['items'] = items
            # Convert date to string for JSON serialization
            if isinstance(order['fecha'], (datetime, date)):
                order['fecha'] = order['fecha'].strftime('%Y-%m-%d')

        return jsonify(order)
    except Exception as e:
        print(f"Error al obtener orden de compra {order_id}: {str(e)}")
        return jsonify({'success': False, 'message': f'Error al obtener orden de compra: {str(e)}'}), 500
    finally:
        connection.close() # Ensure connection is closed

@app.route('/api/ordenes_compra_proveedor/approve/<int:order_id>', methods=['POST'])
def approve_orden_compra_proveedor(order_id):
    if session.get('user_role') not in ['administrador', 'gerencia']:
        return jsonify({'success': False, 'message': 'Acceso denegado'}), 403

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            # Update status to approved
            sql = "UPDATE ordenes_compra_proveedor SET status = 'approved' WHERE id = %s"
            cursor.execute(sql, (order_id,))
            connection.commit()
        return jsonify({'success': True, 'message': 'Orden de compra aprobada exitosamente.'})
    except Exception as e:
        connection.rollback()
        print(f"Error al aprobar orden de compra {order_id}: {str(e)}")
        return jsonify({'success': False, 'message': f'Error al aprobar orden de compra: {str(e)}'}), 500
    finally:
        connection.close()

@app.route('/api/ordenes_compra_proveedor/deny/<int:order_id>', methods=['POST'])
def deny_orden_compra_proveedor(order_id):
    if session.get('user_role') not in ['administrador', 'gerencia']:
        return jsonify({'success': False, 'message': 'Acceso denegado'}), 403

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            sql = "UPDATE ordenes_compra_proveedor SET status = 'denied' WHERE id = %s"
            cursor.execute(sql, (order_id,))
            connection.commit()
        return jsonify({'success': True, 'message': 'Orden de compra denegada.'})
    except Exception as e:
        connection.rollback()
        print(f"Error al denegar orden de compra {order_id}: {str(e)}")
        return jsonify({'success': False, 'message': f'Error al denegar orden de compra: {str(e)}'}), 500
    finally:
        connection.close()

# NEW API: Material Requests
@app.route('/api/material_requests', methods=['POST'])
def add_material_request():
    if session.get('user_role') not in ['control_calidad']:
        return jsonify({'success': False, 'message': 'Acceso denegado'}), 403

    requested_by_user_id = session.get('user_id')
    material_name = request.form.get('material_name')
    quantity_requested = request.form.get('quantity_requested')
    unit = request.form.get('unit')
    reason = request.form.get('reason')

    if not all([requested_by_user_id, material_name, quantity_requested, unit]):
        return jsonify({'success': False, 'message': 'Todos los campos obligatorios deben ser completados.'}), 400

    try:
        quantity_requested = float(quantity_requested)
        if quantity_requested <= 0:
            return jsonify({'success': False, 'message': 'La cantidad solicitada debe ser un número positivo.'}), 400
    except ValueError:
        return jsonify({'success': False, 'message': 'La cantidad solicitada debe ser un número válido.'}), 400

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            sql = """
                INSERT INTO material_requests (requested_by_user_id, material_name, quantity_requested, unit, reason, status)
                VALUES (%s, %s, %s, %s, %s, 'pending')
            """
            cursor.execute(sql, (requested_by_user_id, material_name, quantity_requested, unit, reason))
            connection.commit()
        return jsonify({'success': True, 'message': 'Solicitud de material enviada exitosamente. Esperando aprobación.'})
    except Exception as e:
        connection.rollback()
        print(f"Error adding material request: {str(e)}")
        return jsonify({'success': False, 'message': f'Error al enviar solicitud de material: {str(e)}'}), 500
    finally:
        connection.close()

@app.route('/api/material_requests/list', methods=['GET'])
def list_material_requests():
    if session.get('user_role') not in ['control_calidad', 'administrador', 'gerencia']:
        return jsonify({'success': False, 'message': 'Acceso denegado'}), 403

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            user_role = session.get('user_role')
            user_id = session.get('user_id')

            sql = """
                SELECT mr.*, u.nombre as requester_name, u.apellido as requester_apellido,
                       r.nombre as responder_name, r.apellido as responder_apellido
                FROM material_requests mr
                JOIN usuarios u ON mr.requested_by_user_id = u.id
                LEFT JOIN usuarios r ON mr.responded_by_user_id = r.id
            """
            params = []

            if user_role == 'control_calidad':
                sql += " WHERE mr.requested_by_user_id = %s"
                params.append(user_id)
            
            sql += " ORDER BY mr.request_date DESC"
            
            cursor.execute(sql, tuple(params))
            requests = cursor.fetchall()

            for req in requests:
                if isinstance(req['request_date'], datetime):
                    req['request_date'] = req['request_date'].strftime('%Y-%m-%d %H:%M:%S')
                if req['response_date'] and isinstance(req['response_date'], datetime):
                    req['response_date'] = req['response_date'].strftime('%Y-%m-%d %H:%M:%S')
                
                # Combine requester name and apellido
                req['requester_full_name'] = f"{req['requester_name']} {req['requester_apellido']}"
                del req['requester_name']
                del req['requester_apellido']

                # Combine responder name and apellido if available
                if req['responder_name'] and req['responder_apellido']:
                    req['responder_full_name'] = f"{req['responder_name']} {req['responder_apellido']}"
                else:
                    req['responder_full_name'] = None
                del req['responder_name']
                del req['responder_apellido']

        return jsonify(requests)
    except Exception as e:
        print(f"Error listing material requests: {str(e)}")
        return jsonify({'success': False, 'message': f'Error al listar solicitudes de material: {str(e)}'}), 500
    finally:
        connection.close()

@app.route('/api/material_requests/approve/<int:request_id>', methods=['POST'])
def approve_material_request(request_id):
    if session.get('user_role') not in ['administrador', 'gerencia']:
        return jsonify({'success': False, 'message': 'Acceso denegado'}), 403

    responded_by_user_id = session.get('user_id')
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            # Check if the request exists and is pending
            sql_check = "SELECT status FROM material_requests WHERE id = %s"
            cursor.execute(sql_check, (request_id,))
            request_data = cursor.fetchone()
            if not request_data:
                return jsonify({'success': False, 'message': 'Solicitud de material no encontrada.'}), 404
            if request_data['status'] != 'pending':
                return jsonify({'success': False, 'message': 'La solicitud ya ha sido procesada.'}), 400

            sql = """
                UPDATE material_requests
                SET status = 'approved', response_date = NOW(), responded_by_user_id = %s
                WHERE id = %s
            """
            cursor.execute(sql, (responded_by_user_id, request_id))
            connection.commit()
        return jsonify({'success': True, 'message': 'Solicitud de material aprobada exitosamente.'})
    except Exception as e:
        connection.rollback()
        print(f"Error approving material request {request_id}: {str(e)}")
        return jsonify({'success': False, 'message': f'Error al aprobar solicitud de material: {str(e)}'}), 500
    finally:
        connection.close()

@app.route('/api/material_requests/deny/<int:request_id>', methods=['POST'])
def deny_material_request(request_id):
    if session.get('user_role') not in ['administrador', 'gerencia']:
        return jsonify({'success': False, 'message': 'Acceso denegado'}), 403

    responded_by_user_id = session.get('user_id')
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            # Check if the request exists and is pending
            sql_check = "SELECT status FROM material_requests WHERE id = %s"
            cursor.execute(sql_check, (request_id,))
            request_data = cursor.fetchone()
            if not request_data:
                return jsonify({'success': False, 'message': 'Solicitud de material no encontrada.'}), 404
            if request_data['status'] != 'pending':
                return jsonify({'success': False, 'message': 'La solicitud ya ha sido procesada.'}), 400

            sql = """
                UPDATE material_requests
                SET status = 'denied', response_date = NOW(), responded_by_user_id = %s
                WHERE id = %s
            """
            cursor.execute(sql, (responded_by_user_id, request_id))
            connection.commit()
        return jsonify({'success': True, 'message': 'Solicitud de material denegada.'})
    except Exception as e:
        connection.rollback()
        print(f"Error denying material request {request_id}: {str(e)}")
        return jsonify({'success': False, 'message': f'Error al denegar solicitud de material: {str(e)}'}), 500
    finally:
        connection.close()

if __name__ == '__main__':
    app.run(debug=True, port=os.getenv("PORT", default=3000))
