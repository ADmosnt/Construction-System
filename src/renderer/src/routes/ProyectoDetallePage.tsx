// src/renderer/src/routes/ProyectoDetallePage.tsx

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Header from '../components/layout/Header'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import { showToast } from '../components/ui/Toast'
import { db } from '../lib/database'
import type {
  Proyecto,
  Actividad,
  ResultadoSimulacion,
  MaterialActividad,
  Material
} from '../types'

export default function ProyectoDetallePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [proyecto, setProyecto] = useState<Proyecto | null>(null)
  const [actividades, setActividades] = useState<Actividad[]>([])
  const [loading, setLoading] = useState(true)
  const [showActividadModal, setShowActividadModal] = useState(false)
  const [editingActividad, setEditingActividad] = useState<Actividad | null>(null)

  // Materiales de actividad
  const [showMaterialesModal, setShowMaterialesModal] = useState(false)
  const [selectedActividad, setSelectedActividad] = useState<Actividad | null>(null)
  const [materialesActividad, setMaterialesActividad] = useState<MaterialActividad[]>([])
  const [todosMateriales, setTodosMateriales] = useState<Material[]>([])
  const [showAddMaterialModal, setShowAddMaterialModal] = useState(false)

  // Material seleccionado en el formulario de agregar
  const [selectedMaterialId, setSelectedMaterialId] = useState<number | null>(null)

  // Modal de Reflejar Avance
  const [showAvanceModal, setShowAvanceModal] = useState(false)
  const [avanceActividad, setAvanceActividad] = useState<Actividad | null>(null)
  const [avanceNuevo, setAvanceNuevo] = useState(0)
  const [avanceMateriales, setAvanceMateriales] = useState<MaterialActividad[]>([])
  const [consumosReales, setConsumosReales] = useState<Record<number, number>>({})
  const [confirmandoAvance, setConfirmandoAvance] = useState(false)

  // Simulador
  const [showSimulador, setShowSimulador] = useState(false)
  const [avanceSimulado, setAvanceSimulado] = useState(0)
  const [simulacion, setSimulacion] = useState<ResultadoSimulacion | null>(null)
  const [simulando, setSimulando] = useState(false)

  useEffect(() => {
    if (id) {
      loadProyecto()
      loadActividades()
      loadTodosMateriales()
    }
  }, [id])

  const loadProyecto = async () => {
    try {
      const data = await db.proyectos.getById(Number(id))
      setProyecto(data)
      setAvanceSimulado(data?.avance_actual || 0)
    } catch (error) {
      console.error('Error loading proyecto:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadActividades = async () => {
    try {
      const data = await db.actividades.getByProyecto(Number(id))
      setActividades(data)
    } catch (error) {
      console.error('Error loading actividades:', error)
    }
  }

  const loadTodosMateriales = async () => {
    try {
      const data = await db.materiales.getAll()
      setTodosMateriales(data)
    } catch (error) {
      console.error('Error loading materiales:', error)
    }
  }

  // ==================== MATERIALES DE ACTIVIDAD ====================

  const handleVerMateriales = async (actividad: Actividad) => {
    try {
      const mats = await db.actividades.getMateriales(actividad.id)
      setMaterialesActividad(mats)
      setSelectedActividad(actividad)
      setShowMaterialesModal(true)
    } catch (error) {
      console.error('Error loading materiales:', error)
    }
  }

  const handleAddMaterial = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedActividad) return

    const formData = new FormData(e.currentTarget)
    const materialId = parseInt(formData.get('material_id') as string)
    const cantidadEstimada = parseFloat(formData.get('cantidad_estimada') as string)

    try {
      await db.actividades.addMaterial({
        actividad_id: selectedActividad.id,
        material_id: materialId,
        cantidad_estimada: cantidadEstimada,
        cantidad_consumida: 0
      })

      const mats = await db.actividades.getMateriales(selectedActividad.id)
      setMaterialesActividad(mats)
      await loadTodosMateriales()
      setShowAddMaterialModal(false)
      showToast('Material asignado a la actividad', 'success')

      // Verificar si el stock quedaria por debajo del minimo al consumir lo estimado
      const mat = todosMateriales.find((m) => m.id === materialId)
      if (mat) {
        const stockDespues = mat.stock_actual - cantidadEstimada
        if (stockDespues <= 0) {
          showToast(
            `${mat.nombre}: stock insuficiente para cubrir la estimacion`,
            'error',
            `Stock actual: ${mat.stock_actual.toFixed(2)} ${mat.unidad_abrev}. Al consumir ${cantidadEstimada} quedarian ${stockDespues.toFixed(2)}. Genere una orden de compra.`
          )
        } else if (stockDespues < mat.stock_minimo) {
          showToast(
            `${mat.nombre}: el stock bajara del minimo`,
            'warning',
            `Stock actual: ${mat.stock_actual.toFixed(2)}, minimo: ${mat.stock_minimo.toFixed(2)}. Al consumir ${cantidadEstimada} quedarian ${stockDespues.toFixed(2)} ${mat.unidad_abrev}. Se recomienda generar una orden de compra.`
          )
        }
      }
    } catch (error: any) {
      console.error('Error adding material:', error)
      showToast(error.message || 'Error al agregar material', 'error')
    }
  }

  const handleUpdateMaterial = async (
    matId: number,
    cantidadEstimada: number,
    cantidadConsumida: number
  ) => {
    try {
      await db.actividades.updateMaterial(matId, {
        cantidad_estimada: cantidadEstimada,
        cantidad_consumida: cantidadConsumida
      })

      if (selectedActividad) {
        const mats = await db.actividades.getMateriales(selectedActividad.id)
        setMaterialesActividad(mats)
      }
      showToast('Material actualizado', 'info')
    } catch (error) {
      console.error('Error updating material:', error)
      showToast('Error al actualizar material', 'error')
    }
  }

  const handleRemoveMaterial = async (matId: number) => {
    if (!confirm('Eliminar este material de la actividad?')) return

    try {
      await db.actividades.removeMaterial(matId)

      if (selectedActividad) {
        const mats = await db.actividades.getMateriales(selectedActividad.id)
        setMaterialesActividad(mats)
      }
      showToast('Material eliminado de la actividad', 'info')
    } catch (error) {
      console.error('Error removing material:', error)
      showToast('Error al eliminar material', 'error')
    }
  }

  // ==================== REFLEJAR AVANCE ====================

  const handleOpenAvanceModal = async (actividad: Actividad) => {
    try {
      const mats = await db.actividades.getMateriales(actividad.id)
      setAvanceActividad(actividad)
      setAvanceMateriales(mats)
      setAvanceNuevo(actividad.avance_real)
      // Inicializar consumos reales con 0 (se calculan al cambiar el %)
      const initialConsumos: Record<number, number> = {}
      mats.forEach((m) => {
        initialConsumos[m.id] = 0
      })
      setConsumosReales(initialConsumos)
      setShowAvanceModal(true)
    } catch (error) {
      console.error('Error opening avance modal:', error)
    }
  }

  // Calcular consumo proyectado por material segun delta de avance
  const calcularConsumoProyectado = (mat: MaterialActividad, nuevoAvance: number) => {
    if (!avanceActividad) return 0
    const deltaAvance = nuevoAvance - avanceActividad.avance_real
    if (deltaAvance <= 0) return 0
    const proporcional = (deltaAvance / 100) * mat.cantidad_estimada
    const pendiente = mat.cantidad_estimada - mat.cantidad_consumida
    return Math.min(proporcional, Math.max(0, pendiente))
  }

  // Cuando cambia el avance en el modal, recalcular los consumos proyectados como defaults
  const handleAvanceChange = (nuevoVal: number) => {
    const clamped = Math.min(100, Math.max(avanceActividad?.avance_real || 0, nuevoVal))
    setAvanceNuevo(clamped)

    // Recalcular consumos proyectados como default para cada material
    const newConsumos: Record<number, number> = {}
    avanceMateriales.forEach((mat) => {
      const proyectado = calcularConsumoProyectado(mat, clamped)
      newConsumos[mat.id] = Math.round(proyectado * 100) / 100
    })
    setConsumosReales(newConsumos)
  }

  const handleConfirmarAvance = async () => {
    if (!avanceActividad || avanceNuevo <= avanceActividad.avance_real) return

    try {
      setConfirmandoAvance(true)

      const consumos = avanceMateriales.map((mat) => ({
        material_actividad_id: mat.id,
        material_id: mat.material_id,
        cantidad_consumir: consumosReales[mat.id] || 0
      }))

      const result = await db.actividades.confirmarAvance({
        actividad_id: avanceActividad.id,
        nuevo_avance: avanceNuevo,
        consumos
      })

      // Toast de exito del avance
      if (avanceNuevo >= 100) {
        showToast(
          'Actividad completada al 100%',
          'success',
          'Los materiales consumidos han sido registrados.'
        )
      } else {
        showToast(
          `Avance actualizado a ${avanceNuevo}%`,
          'success',
          'El inventario se ha actualizado segun el consumo confirmado.'
        )
      }

      // Mostrar advertencias de ajuste de stock si las hay
      if (result.advertencias && result.advertencias.length > 0) {
        for (const adv of result.advertencias) {
          showToast('Advertencia de stock', 'warning', adv)
        }
      }

      // Notificaciones individuales por material que alcanzo un nivel de criticidad
      if (result.estadosMateriales && result.estadosMateriales.length > 0) {
        for (const mat of result.estadosMateriales) {
          if (mat.nivel === 'critico') {
            showToast(
              `${mat.nombre}: nivel CRITICO de stock`,
              'error',
              `Stock actual: ${mat.stock_actual.toFixed(2)} (minimo: ${mat.stock_minimo.toFixed(2)}). Genere una orden de compra urgente.`
            )
          } else if (mat.nivel === 'bajo') {
            showToast(
              `${mat.nombre}: nivel BAJO de stock`,
              'warning',
              `Stock actual: ${mat.stock_actual.toFixed(2)} (minimo: ${mat.stock_minimo.toFixed(2)}). Se recomienda generar una orden de compra.`
            )
          }
        }
      }

      // Recalcular avance del proyecto
      await loadActividades()
      const acts = await db.actividades.getByProyecto(Number(id))
      const avancePromedio = acts.reduce((sum, act) => sum + act.avance_real, 0) / acts.length
      await db.proyectos.update(Number(id), {
        avance_actual: Math.round(avancePromedio * 10) / 10
      })
      await loadProyecto()
      await loadTodosMateriales()

      // Generar alertas
      await db.alertas.generar(Number(id))

      setShowAvanceModal(false)
      setAvanceActividad(null)
    } catch (error: any) {
      console.error('Error confirmando avance:', error)
      showToast(error.message || 'Error al confirmar avance', 'error')
    } finally {
      setConfirmandoAvance(false)
    }
  }

  // ==================== ACTIVIDADES CRUD ====================

  const handleSaveActividad = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    const actividadData = {
      proyecto_id: Number(id),
      nombre: formData.get('nombre') as string,
      descripcion: formData.get('descripcion') as string,
      orden: parseInt(formData.get('orden') as string),
      avance_planificado: parseFloat(formData.get('avance_planificado') as string) || 0,
      avance_real: parseFloat(formData.get('avance_real') as string) || 0,
      fecha_inicio_planificada: (formData.get('fecha_inicio_planificada') as string) || null,
      fecha_fin_planificada: (formData.get('fecha_fin_planificada') as string) || null
    }

    try {
      if (editingActividad) {
        await db.actividades.update(editingActividad.id, actividadData)
        showToast('Actividad actualizada', 'success')
      } else {
        await db.actividades.create(actividadData)
        showToast('Actividad creada exitosamente', 'success')
      }
      await loadActividades()
      setShowActividadModal(false)
      setEditingActividad(null)
    } catch (error) {
      console.error('Error saving actividad:', error)
      showToast('Error al guardar la actividad', 'error')
    }
  }

  // ==================== SIMULADOR ====================

  const handleSimular = async () => {
    if (!proyecto || avanceSimulado <= proyecto.avance_actual) {
      showToast('El avance simulado debe ser mayor al avance actual', 'warning')
      return
    }

    try {
      setSimulando(true)
      const resultado = await db.simulador.simular(Number(id), avanceSimulado)
      setSimulacion(resultado)
    } catch (error: any) {
      console.error('Error simulando:', error)
      showToast('Error al simular: ' + error.message, 'error')
    } finally {
      setSimulando(false)
    }
  }

  const getColorEstado = (estado: string) => {
    const colores = {
      critico: 'bg-red-100 text-red-700 border-red-300',
      bajo: 'bg-orange-100 text-orange-700 border-orange-300',
      alerta: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      ok: 'bg-green-100 text-green-700 border-green-300'
    }
    return colores[estado as keyof typeof colores] || colores.ok
  }

  const materialesDisponibles = todosMateriales.filter(
    (m) => !materialesActividad.some((ma) => ma.material_id === m.id)
  )

  const isActividadCompleta = selectedActividad?.avance_real === 100

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando proyecto...</p>
        </div>
      </div>
    )
  }

  if (!proyecto) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-xl text-gray-600 mb-4">Proyecto no encontrado</p>
          <Button onClick={() => navigate('/proyectos')}>Volver a Proyectos</Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header
        title={proyecto.nombre}
        subtitle={proyecto.descripcion || ''}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowSimulador(!showSimulador)}>
              {showSimulador ? 'Ocultar' : 'Mostrar'} Simulador
            </Button>
            <Button variant="ghost" onClick={() => navigate('/proyectos')}>
              Volver
            </Button>
          </div>
        }
      />

      <div className="p-8">
        {/* Informacion General */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Informacion del Proyecto</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-500">Estado</p>
              <span
                className={`
                inline-block mt-1 px-3 py-1 rounded-full text-sm font-semibold
                ${proyecto.estado === 'activo' ? 'bg-green-100 text-green-700' : ''}
                ${proyecto.estado === 'pausado' ? 'bg-yellow-100 text-yellow-700' : ''}
                ${proyecto.estado === 'finalizado' ? 'bg-gray-100 text-gray-700' : ''}
              `}
              >
                {proyecto.estado.toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Ubicacion</p>
              <p className="font-medium mt-1">{proyecto.ubicacion}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Presupuesto</p>
              <p className="font-medium mt-1">${proyecto.presupuesto_total.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Fecha Inicio</p>
              <p className="font-medium mt-1">
                {new Date(proyecto.fecha_inicio).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Fecha Fin Estimada</p>
              <p className="font-medium mt-1">
                {new Date(proyecto.fecha_fin_estimada).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Avance General</p>
              <p className="font-medium mt-1 text-2xl">{proyecto.avance_actual}%</p>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600 font-medium">Progreso General</span>
              <span className="font-semibold">{proyecto.avance_actual}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className={`h-4 rounded-full transition-all ${
                  proyecto.avance_actual < 40
                    ? 'bg-blue-500'
                    : proyecto.avance_actual < 75
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                }`}
                style={{ width: `${proyecto.avance_actual}%` }}
              />
            </div>
          </div>
        </div>

        {/* SIMULADOR */}
        {showSimulador && (
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <div>
                <h2 className="text-xl font-bold text-purple-900">
                  Simulador de Consumo Predictivo
                </h2>
                <p className="text-sm text-purple-700">
                  Proyecta el impacto en el inventario segun el avance del proyecto
                </p>
              </div>
            </div>

            {/* Panel explicativo del simulador */}
            <div className="bg-white border border-purple-200 rounded-lg p-5 mb-4">
              <h3 className="text-sm font-bold text-purple-900 mb-3">Como funciona el simulador?</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                <div className="bg-purple-50 rounded-lg p-3">
                  <p className="text-xs font-bold text-purple-800 mb-1">1. Define un avance hipotetico</p>
                  <p className="text-xs text-purple-700">
                    Usa el control deslizante o escribe un porcentaje de avance mayor al actual.
                    El simulador calculara que pasaria si el proyecto llegara a ese punto.
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3">
                  <p className="text-xs font-bold text-purple-800 mb-1">2. Calculo del consumo</p>
                  <p className="text-xs text-purple-700">
                    Para cada actividad, se calcula: <strong>consumo = (avance_simulado / 100) x cantidad_estimada - cantidad_ya_consumida</strong>.
                    Se agrupa por material sumando todas las actividades.
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3">
                  <p className="text-xs font-bold text-purple-800 mb-1">3. Proyeccion de stock</p>
                  <p className="text-xs text-purple-700">
                    Se resta el consumo proyectado al stock actual: <strong>stock_final = stock_actual - consumo</strong>.
                    Si el resultado cae bajo el minimo, se sugiere generar una orden de compra.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded bg-red-200 border border-red-400"></span>
                  <span className="text-gray-600"><strong>Critico:</strong> stock &le; 0 o &lt; 50% del minimo</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded bg-orange-200 border border-orange-400"></span>
                  <span className="text-gray-600"><strong>Bajo:</strong> stock &lt; minimo</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded bg-yellow-200 border border-yellow-400"></span>
                  <span className="text-gray-600"><strong>Alerta:</strong> stock &lt; 120% del minimo</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded bg-green-200 border border-green-400"></span>
                  <span className="text-gray-600"><strong>OK:</strong> stock suficiente</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 mb-4">
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Que pasaria si el proyecto avanza hasta...?
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={proyecto.avance_actual}
                    max="100"
                    step="5"
                    value={avanceSimulado}
                    onChange={(e) => setAvanceSimulado(parseFloat(e.target.value))}
                    className="flex-1"
                  />
                  <input
                    type="number"
                    min={proyecto.avance_actual}
                    max="100"
                    value={avanceSimulado}
                    onChange={(e) => setAvanceSimulado(parseFloat(e.target.value))}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center font-bold text-lg"
                  />
                  <span className="font-bold text-lg">%</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Avance actual: {proyecto.avance_actual}% - Incremento: +
                  {(avanceSimulado - proyecto.avance_actual).toFixed(1)}%
                </p>
              </div>

              <Button
                onClick={handleSimular}
                disabled={simulando || avanceSimulado <= proyecto.avance_actual}
                className="w-full"
              >
                {simulando ? 'Simulando...' : 'Simular Impacto'}
              </Button>
            </div>

            {simulacion && (
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-6">
                  <h3 className="text-lg font-bold mb-4">Resumen de Proyeccion</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm text-blue-700">Total Materiales</p>
                      <p className="text-3xl font-bold text-blue-900">
                        {simulacion.resumen.total_materiales}
                      </p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4">
                      <p className="text-sm text-red-700">Materiales Criticos</p>
                      <p className="text-3xl font-bold text-red-900">
                        {simulacion.resumen.materiales_criticos}
                      </p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4">
                      <p className="text-sm text-orange-700">Requieren Orden</p>
                      <p className="text-3xl font-bold text-orange-900">
                        {simulacion.resumen.materiales_requieren_orden}
                      </p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-sm text-green-700">Costo Estimado</p>
                      <p className="text-2xl font-bold text-green-900">
                        ${simulacion.resumen.costo_estimado_ordenes.toFixed(0)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-6">
                  <h3 className="text-lg font-bold mb-4">Proyeccion de Materiales</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left">Material</th>
                          <th className="px-4 py-2 text-center">Stock Actual</th>
                          <th className="px-4 py-2 text-center">Consumo</th>
                          <th className="px-4 py-2 text-center">Stock Final</th>
                          <th className="px-4 py-2 text-center">Estado</th>
                          <th className="px-4 py-2 text-center">Accion</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {simulacion.materiales.map((mat) => (
                          <tr key={mat.material_id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <p className="font-medium">{mat.material_nombre}</p>
                              <p className="text-xs text-gray-500">{mat.proveedor_nombre}</p>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <p className="font-semibold">{mat.stock_actual.toFixed(2)}</p>
                              <p className="text-xs text-gray-500">{mat.unidad_abrev}</p>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <p className="font-semibold text-red-600">
                                -{mat.consumo_proyectado.toFixed(2)}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <p
                                className={`font-bold ${mat.stock_proyectado < 0 ? 'text-red-600' : 'text-gray-900'}`}
                              >
                                {mat.stock_proyectado.toFixed(2)}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`inline-block px-2 py-1 text-xs font-bold rounded border ${getColorEstado(mat.estado)}`}
                              >
                                {mat.estado.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {mat.requiere_orden ? (
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    navigate(
                                      `/ordenes?materialId=${mat.material_id}&proyectoId=${id}&cantidad=${mat.cantidad_ordenar.toFixed(2)}`
                                    )
                                  }
                                >
                                  Ordenar
                                </Button>
                              ) : (
                                <span className="text-green-600 text-xs font-semibold">OK</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actividades */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Actividades del Proyecto</h2>
            <Button
              size="sm"
              onClick={() => {
                setEditingActividad(null)
                setShowActividadModal(true)
              }}
            >
              + Nueva Actividad
            </Button>
          </div>

          <div className="p-6">
            {actividades.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">No hay actividades registradas</p>
                <Button onClick={() => setShowActividadModal(true)}>
                  Crear primera actividad
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {actividades.map((actividad) => {
                  const isCompleta = actividad.avance_real >= 100

                  return (
                    <div
                      key={actividad.id}
                      className={`border rounded-lg p-4 transition-shadow ${
                        isCompleta
                          ? 'border-green-300 bg-green-50'
                          : 'border-gray-200 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-gray-500">
                              #{actividad.orden}
                            </span>
                            <h3 className="font-semibold text-gray-900">{actividad.nombre}</h3>
                            {isCompleta && (
                              <span className="px-2 py-0.5 bg-green-200 text-green-800 text-xs font-bold rounded-full">
                                COMPLETADA
                              </span>
                            )}
                          </div>
                          {actividad.descripcion && (
                            <p className="text-sm text-gray-600">{actividad.descripcion}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleVerMateriales(actividad)}
                          >
                            Materiales
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingActividad(actividad)
                              setShowActividadModal(true)
                            }}
                          >
                            Editar
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                        {actividad.fecha_inicio_planificada && (
                          <div>
                            <p className="text-gray-500">Inicio Planificado</p>
                            <p className="font-medium">
                              {new Date(actividad.fecha_inicio_planificada).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                        {actividad.fecha_fin_planificada && (
                          <div>
                            <p className="text-gray-500">Fin Planificado</p>
                            <p className="font-medium">
                              {new Date(actividad.fecha_fin_planificada).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Barras de avance planificado vs real */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-600">Avance Planificado</span>
                          <span className="font-medium">{actividad.avance_planificado}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                          <div
                            className="h-2 rounded-full bg-gray-400"
                            style={{ width: `${actividad.avance_planificado}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-600">Avance Real</span>
                          <span className="font-semibold">{actividad.avance_real}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              actividad.avance_real < actividad.avance_planificado
                                ? 'bg-red-500'
                                : actividad.avance_real === actividad.avance_planificado
                                  ? 'bg-green-500'
                                  : 'bg-blue-500'
                            }`}
                            style={{ width: `${actividad.avance_real}%` }}
                          />
                        </div>
                      </div>

                      {/* Boton Reflejar Avance */}
                      {isCompleta ? (
                        <div className="bg-green-100 border border-green-300 rounded-lg p-3 text-center">
                          <p className="text-sm text-green-800 font-semibold">
                            Actividad completada al 100%. Revise los materiales para verificar el
                            consumo final.
                          </p>
                        </div>
                      ) : (
                        <div className="flex justify-center mt-2">
                          <Button onClick={() => handleOpenAvanceModal(actividad)}>
                            Reflejar Avance
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Actividad (crear/editar) */}
      <Modal
        isOpen={showActividadModal}
        onClose={() => {
          setShowActividadModal(false)
          setEditingActividad(null)
        }}
        title={editingActividad ? 'Editar Actividad' : 'Nueva Actividad'}
        size="lg"
      >
        <form onSubmit={handleSaveActividad}>
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <Input
                name="orden"
                label="Orden"
                type="number"
                required
                defaultValue={editingActividad?.orden || actividades.length + 1}
              />
              <div className="col-span-3">
                <Input
                  name="nombre"
                  label="Nombre de la Actividad"
                  required
                  defaultValue={editingActividad?.nombre}
                  placeholder="Ej: Excavacion y movimiento de tierra"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripcion</label>
              <textarea
                name="descripcion"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                defaultValue={editingActividad?.descripcion || ''}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                name="fecha_inicio_planificada"
                label="Fecha Inicio Planificada"
                type="date"
                defaultValue={editingActividad?.fecha_inicio_planificada || ''}
              />
              <Input
                name="fecha_fin_planificada"
                label="Fecha Fin Planificada"
                type="date"
                defaultValue={editingActividad?.fecha_fin_planificada || ''}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                name="avance_planificado"
                label="Avance Planificado (%)"
                type="number"
                step="0.1"
                min="0"
                max="100"
                defaultValue={editingActividad?.avance_planificado || 0}
              />
              <Input
                name="avance_real"
                label="Avance Real (%)"
                type="number"
                step="0.1"
                min="0"
                max="100"
                defaultValue={editingActividad?.avance_real || 0}
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
            <Button type="submit" className="flex-1">
              {editingActividad ? 'Actualizar' : 'Crear'} Actividad
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowActividadModal(false)
                setEditingActividad(null)
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      {/* ==================== MODAL REFLEJAR AVANCE ==================== */}
      <Modal
        isOpen={showAvanceModal}
        onClose={() => {
          setShowAvanceModal(false)
          setAvanceActividad(null)
        }}
        title={`Reflejar Avance - ${avanceActividad?.nombre || ''}`}
        size="xl"
      >
        {avanceActividad && (
          <div className="space-y-5">
            {/* Seccion: Porcentaje de Avance */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
              <h3 className="text-sm font-bold text-blue-800 mb-3">Nuevo Porcentaje de Avance</h3>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Actual</p>
                  <p className="text-2xl font-bold text-gray-600">{avanceActividad.avance_real}%</p>
                </div>
                <div className="text-2xl text-gray-400">&rarr;</div>
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="number"
                    min={avanceActividad.avance_real + 1}
                    max={100}
                    step="1"
                    value={avanceNuevo}
                    onChange={(e) =>
                      handleAvanceChange(parseFloat(e.target.value) || avanceActividad.avance_real)
                    }
                    className="w-24 px-3 py-3 border-2 border-blue-300 rounded-lg text-center font-bold text-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="font-bold text-lg">%</span>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Incremento</p>
                  <p className={`text-lg font-bold ${avanceNuevo > avanceActividad.avance_real ? 'text-blue-700' : 'text-gray-400'}`}>
                    +{Math.max(0, avanceNuevo - avanceActividad.avance_real)}%
                  </p>
                </div>
              </div>
            </div>

            {/* Seccion: Materiales */}
            {avanceMateriales.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                <p className="text-sm text-yellow-800">
                  Esta actividad no tiene materiales asignados. El avance se registrara sin consumo de materiales.
                </p>
              </div>
            ) : (
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3">
                  Consumo de Materiales
                </h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Material
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          Stock Disp.
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          Ya Consumido
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          Proyectado
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          Consumo Real
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {avanceMateriales.map((mat) => {
                        const proyectado = calcularConsumoProyectado(mat, avanceNuevo)
                        const consumoReal = consumosReales[mat.id] || 0
                        const stockDisp = mat.stock_actual || 0
                        const excedeLimite = consumoReal > (mat.cantidad_estimada - mat.cantidad_consumida)
                        const excedeStock = consumoReal > stockDisp

                        return (
                          <tr key={mat.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-900">{mat.material_nombre}</p>
                              <p className="text-xs text-gray-500">
                                Estimado total: {mat.cantidad_estimada} {mat.unidad_abrev} |
                                Pendiente: {(mat.cantidad_estimada - mat.cantidad_consumida).toFixed(2)}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`font-semibold ${stockDisp <= 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                {stockDisp.toFixed(2)}
                              </span>
                              <p className="text-xs text-gray-500">{mat.unidad_abrev}</p>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-gray-600">{mat.cantidad_consumida.toFixed(2)}</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-blue-600 font-medium">
                                {proyectado.toFixed(2)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={consumoReal}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0
                                  setConsumosReales((prev) => ({ ...prev, [mat.id]: val }))
                                }}
                                className={`w-24 px-2 py-1 border-2 rounded text-center text-sm font-semibold ${
                                  excedeStock
                                    ? 'border-red-400 bg-red-50 text-red-700'
                                    : excedeLimite
                                      ? 'border-orange-400 bg-orange-50 text-orange-700'
                                      : 'border-gray-300'
                                }`}
                              />
                              {excedeStock && (
                                <p className="text-xs text-red-600 mt-1 font-medium">
                                  Excede stock!
                                </p>
                              )}
                              {excedeLimite && !excedeStock && (
                                <p className="text-xs text-orange-600 mt-1">
                                  Supera estimado (se ajustara)
                                </p>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Leyenda */}
                <div className="mt-3 space-y-1">
                  <p className="text-xs text-gray-500">
                    <strong>Proyectado:</strong> Consumo calculado proporcionalmente segun el incremento de avance (solo lectura).
                  </p>
                  <p className="text-xs text-gray-500">
                    <strong>Consumo Real:</strong> Cantidad que realmente se consumio. Editable para ajustar si difiere de la proyeccion.
                  </p>
                  <p className="text-xs text-orange-600">
                    Si el consumo real supera la estimacion original, el sistema ajustara automaticamente la cantidad estimada.
                  </p>
                </div>
              </div>
            )}

            {/* Botones de accion */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <Button
                className="flex-1"
                onClick={handleConfirmarAvance}
                disabled={
                  confirmandoAvance ||
                  avanceNuevo <= avanceActividad.avance_real ||
                  avanceMateriales.some(
                    (m) => (consumosReales[m.id] || 0) > (m.stock_actual || 0)
                  )
                }
              >
                {confirmandoAvance ? 'Confirmando...' : 'Confirmar Avance y Consumo'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowAvanceModal(false)
                  setAvanceActividad(null)
                }}
              >
                Cancelar
              </Button>
            </div>

            {avanceMateriales.some(
              (m) => (consumosReales[m.id] || 0) > (m.stock_actual || 0)
            ) && (
              <div className="bg-red-50 border border-red-300 rounded-lg p-3">
                <p className="text-sm text-red-700 font-semibold">
                  No se puede confirmar: uno o mas materiales tienen un consumo real que supera el stock disponible.
                  Reduzca la cantidad o genere una orden de compra primero.
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* MODAL DE MATERIALES DE ACTIVIDAD */}
      <Modal
        isOpen={showMaterialesModal}
        onClose={() => {
          setShowMaterialesModal(false)
          setSelectedActividad(null)
          setMaterialesActividad([])
        }}
        title={`Materiales - ${selectedActividad?.nombre || ''}`}
        size="xl"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Gestiona los materiales necesarios para esta actividad
            </p>
            {!isActividadCompleta && (
              <Button
                size="sm"
                onClick={() => setShowAddMaterialModal(true)}
                disabled={materialesDisponibles.length === 0}
              >
                + Agregar Material
              </Button>
            )}
          </div>

          {isActividadCompleta && (
            <div className="bg-green-50 border border-green-300 rounded-lg p-4">
              <p className="text-sm text-green-800 font-semibold">
                Actividad completada. La cantidad estimada esta bloqueada. Puede ajustar la cantidad
                consumida final si difiere de lo calculado automaticamente.
              </p>
            </div>
          )}

          {materialesActividad.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-500 mb-2">No hay materiales asignados a esta actividad</p>
              <p className="text-sm text-gray-400">
                Los materiales asignados se usaran para calcular alertas y proyecciones
              </p>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Material
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Stock Disp.
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Cant. Estimada
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Cant. Consumida
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Pendiente
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Costo Est.
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {materialesActividad.map((ma) => {
                    const pendiente = ma.cantidad_estimada - ma.cantidad_consumida
                    const costoEstimado = ma.cantidad_estimada * (ma.precio_unitario || 0)

                    return (
                      <tr key={ma.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{ma.material_nombre}</p>
                          <p className="text-xs text-gray-500">{ma.unidad_abrev}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-semibold text-sm ${(ma.stock_actual || 0) <= 0 ? 'text-red-600' : 'text-gray-700'}`}>
                            {(ma.stock_actual || 0).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            key={`est-${ma.id}-${ma.cantidad_estimada}`}
                            type="number"
                            step="0.01"
                            min="0"
                            defaultValue={ma.cantidad_estimada}
                            disabled={isActividadCompleta}
                            onBlur={(e) => {
                              const val = parseFloat(e.target.value) || 0
                              if (val !== ma.cantidad_estimada) {
                                handleUpdateMaterial(ma.id, val, ma.cantidad_consumida)
                              }
                            }}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-center text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            key={`con-${ma.id}-${ma.cantidad_consumida}`}
                            type="number"
                            step="0.01"
                            min="0"
                            max={ma.cantidad_estimada}
                            defaultValue={ma.cantidad_consumida}
                            onBlur={(e) => {
                              const val = parseFloat(e.target.value) || 0
                              if (val !== ma.cantidad_consumida) {
                                handleUpdateMaterial(ma.id, ma.cantidad_estimada, val)
                              }
                            }}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`font-semibold ${pendiente > 0 ? 'text-orange-600' : 'text-green-600'}`}
                          >
                            {pendiente.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-medium text-gray-900">
                          ${costoEstimado.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {!isActividadCompleta && (
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => handleRemoveMaterial(ma.id)}
                            >
                              Eliminar
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-right font-semibold text-gray-700">
                      Total Estimado:
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-gray-900">
                      $
                      {materialesActividad
                        .reduce(
                          (sum, ma) => sum + ma.cantidad_estimada * (ma.precio_unitario || 0),
                          0
                        )
                        .toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> La "Cantidad Estimada" es lo que se planea usar en total para
              esta actividad. Si durante la ejecucion necesita mas material del previsto, aumente la
              cantidad estimada aqui. La "Cantidad Consumida" se actualiza automaticamente al usar
              "Reflejar Avance". Los valores se guardan al salir del campo (clic fuera del input).
            </p>
          </div>
        </div>
      </Modal>

      {/* MODAL DE AGREGAR MATERIAL */}
      <Modal
        isOpen={showAddMaterialModal}
        onClose={() => {
          setShowAddMaterialModal(false)
          setSelectedMaterialId(null)
        }}
        title="Agregar Material a la Actividad"
        size="md"
      >
        <form
          onSubmit={(e) => {
            handleAddMaterial(e)
            setSelectedMaterialId(null)
          }}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Material <span className="text-red-500">*</span>
              </label>
              <select
                name="material_id"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => setSelectedMaterialId(parseInt(e.target.value) || null)}
              >
                <option value="">Seleccionar material...</option>
                {materialesDisponibles.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre} - Stock: {m.stock_actual.toFixed(2)} {m.unidad_abrev} - $
                    {m.precio_unitario}/{m.unidad_abrev}
                  </option>
                ))}
              </select>
              {materialesDisponibles.length === 0 && (
                <p className="text-xs text-orange-600 mt-1">
                  Todos los materiales ya estan asignados a esta actividad
                </p>
              )}
            </div>

            {selectedMaterialId &&
              (() => {
                const mat = todosMateriales.find((m) => m.id === selectedMaterialId)
                if (!mat) return null
                return (
                  <div
                    className={`border rounded-lg p-3 ${mat.stock_actual <= mat.stock_minimo ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}
                  >
                    <p
                      className={`text-sm font-semibold ${mat.stock_actual <= mat.stock_minimo ? 'text-red-800' : 'text-blue-800'}`}
                    >
                      Stock disponible: {mat.stock_actual.toFixed(2)} {mat.unidad_abrev}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Stock minimo: {mat.stock_minimo.toFixed(2)} {mat.unidad_abrev} | La cantidad
                      estimada no puede superar el stock disponible.
                    </p>
                  </div>
                )
              })()}

            <Input
              name="cantidad_estimada"
              label="Cantidad Estimada"
              type="number"
              step="0.01"
              min="0.01"
              max={
                selectedMaterialId
                  ? todosMateriales.find((m) => m.id === selectedMaterialId)?.stock_actual ||
                    undefined
                  : undefined
              }
              required
              placeholder="0.00"
            />

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <strong>Nota:</strong> La cantidad estimada representa el total de material que se
                espera consumir durante toda la ejecucion de esta actividad. No puede superar la
                cantidad en existencias.
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
            <Button type="submit" className="flex-1" disabled={materialesDisponibles.length === 0}>
              Agregar Material
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowAddMaterialModal(false)
                setSelectedMaterialId(null)
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
