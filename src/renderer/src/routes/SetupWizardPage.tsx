// src/renderer/src/routes/SetupWizardPage.tsx

import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { db } from '../lib/database'
import { showToast } from '../components/ui/Toast'

const SECURITY_QUESTIONS = [
  '¿Cual fue el nombre de tu primera mascota?',
  '¿En que ciudad naciste?',
  '¿Cual es tu comida favorita?',
  '¿Cual fue el nombre de tu mejor amigo de la infancia?',
  '¿En que escuela cursaste la primaria?',
  '¿Cual es el nombre de soltera de tu madre?',
  '¿Cual fue tu primer trabajo?',
  '¿Cual es tu pelicula favorita?',
  '¿En que año te graduaste del bachillerato?',
  '¿Cual es el nombre de tu abuelo paterno?',
  '¿Cual fue el modelo de tu primer vehiculo?',
  '¿Cual es tu color favorito?',
  '¿En que calle creciste?',
  '¿Cual es tu deporte favorito?',
  '¿Cual fue el nombre de tu primer profesor?',
  '¿Cual es el segundo nombre de tu padre?',
  '¿Cual fue el primer libro que leiste completo?',
  '¿En que hospital naciste?',
  '¿Cual fue tu apodo de infancia?',
  '¿Cual es el nombre de tu cancion favorita?',
]

export { SECURITY_QUESTIONS }

export default function SetupWizardPage() {
  const { completeSetup } = useAuth()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Step 1: Credenciales
  const [username, setUsername] = useState('')
  const [nombreCompleto, setNombreCompleto] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')

  // Step 2: Preguntas de seguridad
  const [pregunta1, setPregunta1] = useState('')
  const [respuesta1, setRespuesta1] = useState('')
  const [pregunta2, setPregunta2] = useState('')
  const [respuesta2, setRespuesta2] = useState('')

  const handleStep1 = () => {
    setError('')

    if (!username.trim()) {
      setError('El nombre de usuario es obligatorio.')
      return
    }
    if (username.trim().length < 3) {
      setError('El usuario debe tener al menos 3 caracteres.')
      return
    }
    if (!nombreCompleto.trim()) {
      setError('El nombre completo es obligatorio.')
      return
    }
    if (password.length < 4) {
      setError('La contraseña debe tener al menos 4 caracteres.')
      return
    }
    if (password !== passwordConfirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setStep(2)
  }

  const handleStep2 = async () => {
    setError('')

    if (!pregunta1) {
      setError('Seleccione la primera pregunta de seguridad.')
      return
    }
    if (!respuesta1.trim()) {
      setError('Escriba la respuesta a la primera pregunta.')
      return
    }
    if (!pregunta2) {
      setError('Seleccione la segunda pregunta de seguridad.')
      return
    }
    if (pregunta1 === pregunta2) {
      setError('Las dos preguntas deben ser diferentes.')
      return
    }
    if (!respuesta2.trim()) {
      setError('Escriba la respuesta a la segunda pregunta.')
      return
    }

    try {
      setLoading(true)
      const user = await db.auth.setup({
        username: username.trim(),
        password,
        nombre_completo: nombreCompleto.trim(),
        pregunta_seguridad_1: pregunta1,
        respuesta_1: respuesta1,
        pregunta_seguridad_2: pregunta2,
        respuesta_2: respuesta2
      })

      showToast('Cuenta de administrador creada exitosamente', 'success')
      completeSetup(user)
    } catch (err: any) {
      setError(err.message || 'Error al crear la cuenta.')
    } finally {
      setLoading(false)
    }
  }

  const preguntasDisponibles2 = SECURITY_QUESTIONS.filter(q => q !== pregunta1)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-4">
            <span className="text-4xl">🏗</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Bienvenido al Sistema</h1>
          <p className="text-blue-200 mt-2">Vamos a configurar la cuenta de administrador</p>
        </div>

        {/* Indicador de paso */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${
            step === 1 ? 'bg-blue-500 text-white' : 'bg-blue-800 text-blue-300'
          }`}>
            <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs">1</span>
            Credenciales
          </div>
          <div className="w-8 h-0.5 bg-blue-700"></div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${
            step === 2 ? 'bg-blue-500 text-white' : 'bg-blue-800 text-blue-300'
          }`}>
            <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs">2</span>
            Seguridad
          </div>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Crear cuenta de Administrador</h2>
              <p className="text-sm text-gray-500 mb-6">
                Esta cuenta sera la unica con acceso al sistema. Elija credenciales que pueda recordar.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre de usuario <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ej: admin, jperez, mgarcia"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre completo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={nombreCompleto}
                    onChange={(e) => setNombreCompleto(e.target.value)}
                    placeholder="Ej: Juan Perez Garcia"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contraseña <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimo 4 caracteres"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmar contraseña <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    placeholder="Repita la contraseña"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <button
                  onClick={handleStep1}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors text-sm"
                >
                  Siguiente: Preguntas de Seguridad
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Preguntas de Seguridad</h2>
              <p className="text-sm text-gray-500 mb-6">
                Si olvida su contraseña, estas preguntas le permitiran recuperar el acceso. Elija preguntas cuyas respuestas pueda recordar facilmente.
              </p>

              <div className="space-y-5">
                {/* Pregunta 1 */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <label className="block text-sm font-bold text-blue-800 mb-2">
                    Pregunta de seguridad 1 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={pregunta1}
                    onChange={(e) => setPregunta1(e.target.value)}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                  >
                    <option value="">Seleccionar pregunta...</option>
                    {SECURITY_QUESTIONS.map((q, i) => (
                      <option key={i} value={q}>{q}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={respuesta1}
                    onChange={(e) => setRespuesta1(e.target.value)}
                    placeholder="Su respuesta..."
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Pregunta 2 */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <label className="block text-sm font-bold text-blue-800 mb-2">
                    Pregunta de seguridad 2 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={pregunta2}
                    onChange={(e) => setPregunta2(e.target.value)}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                  >
                    <option value="">Seleccionar pregunta...</option>
                    {preguntasDisponibles2.map((q, i) => (
                      <option key={i} value={q}>{q}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={respuesta2}
                    onChange={(e) => setRespuesta2(e.target.value)}
                    placeholder="Su respuesta..."
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-xs text-yellow-800">
                    <strong>Importante:</strong> Las respuestas no distinguen entre mayusculas y minusculas. Asegurese de recordar las respuestas exactas, ya que son la unica forma de recuperar su cuenta si olvida la contraseña.
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => { setStep(1); setError('') }}
                    className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors text-sm"
                  >
                    Atras
                  </button>
                  <button
                    onClick={handleStep2}
                    disabled={loading}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors text-sm"
                  >
                    {loading ? 'Creando cuenta...' : 'Crear Cuenta y Entrar'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
