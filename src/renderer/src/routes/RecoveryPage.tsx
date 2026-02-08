// src/renderer/src/routes/RecoveryPage.tsx

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../lib/database'
import { showToast } from '../components/ui/Toast'

export default function RecoveryPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<'username' | 'questions' | 'success'>('username')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Step 1
  const [username, setUsername] = useState('')

  // Step 2
  const [pregunta1, setPregunta1] = useState('')
  const [pregunta2, setPregunta2] = useState('')
  const [respuesta1, setRespuesta1] = useState('')
  const [respuesta2, setRespuesta2] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')

  const handleFindUser = async () => {
    setError('')
    if (!username.trim()) {
      setError('Ingrese su nombre de usuario.')
      return
    }

    try {
      setLoading(true)
      const result = await db.auth.getSecurityQuestions(username.trim())
      setPregunta1(result.pregunta1)
      setPregunta2(result.pregunta2)
      setStep('questions')
    } catch (err: any) {
      setError(err.message || 'Usuario no encontrado.')
    } finally {
      setLoading(false)
    }
  }

  const handleRecover = async () => {
    setError('')

    if (!respuesta1.trim() || !respuesta2.trim()) {
      setError('Debe responder ambas preguntas de seguridad.')
      return
    }
    if (newPassword.length < 4) {
      setError('La nueva contraseña debe tener al menos 4 caracteres.')
      return
    }
    if (newPassword !== newPasswordConfirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    try {
      setLoading(true)
      await db.auth.recover({
        username: username.trim(),
        respuesta_1: respuesta1,
        respuesta_2: respuesta2,
        new_password: newPassword
      })
      setStep('success')
      showToast('Contraseña actualizada exitosamente', 'success')
    } catch (err: any) {
      setError(err.message || 'Error al recuperar la contraseña.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-4">
            <span className="text-4xl">🔑</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Recuperar Contraseña</h1>
          <p className="text-blue-200 mt-2">Responda sus preguntas de seguridad</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Step 1: Buscar usuario */}
          {step === 'username' && (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Identificar cuenta</h2>
              <p className="text-sm text-gray-500 mb-6">
                Ingrese el nombre de usuario de la cuenta que desea recuperar.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de usuario</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ingrese su usuario"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    autoFocus
                    disabled={loading}
                    onKeyDown={(e) => e.key === 'Enter' && handleFindUser()}
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => navigate('/login')}
                    className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors text-sm"
                  >
                    Volver al Login
                  </button>
                  <button
                    onClick={handleFindUser}
                    disabled={loading}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors text-sm"
                  >
                    {loading ? 'Buscando...' : 'Continuar'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Preguntas de seguridad */}
          {step === 'questions' && (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Preguntas de Seguridad</h2>
              <p className="text-sm text-gray-500 mb-6">
                Responda las preguntas que configuro al crear su cuenta. Las respuestas no distinguen mayusculas de minusculas.
              </p>

              <div className="space-y-5">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-bold text-blue-800 mb-2">{pregunta1}</p>
                  <input
                    type="text"
                    value={respuesta1}
                    onChange={(e) => setRespuesta1(e.target.value)}
                    placeholder="Su respuesta..."
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-bold text-blue-800 mb-2">{pregunta2}</p>
                  <input
                    type="text"
                    value={respuesta2}
                    onChange={(e) => setRespuesta2(e.target.value)}
                    placeholder="Su respuesta..."
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-sm font-bold text-gray-700 mb-3">Establecer nueva contraseña</h3>
                  <div className="space-y-3">
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Nueva contraseña (minimo 4 caracteres)"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <input
                      type="password"
                      value={newPasswordConfirm}
                      onChange={(e) => setNewPasswordConfirm(e.target.value)}
                      placeholder="Confirmar nueva contraseña"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => { setStep('username'); setError('') }}
                    className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors text-sm"
                  >
                    Atras
                  </button>
                  <button
                    onClick={handleRecover}
                    disabled={loading}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors text-sm"
                  >
                    {loading ? 'Verificando...' : 'Restablecer Contraseña'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Exito */}
          {step === 'success' && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">✓</span>
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Contraseña Actualizada</h2>
              <p className="text-sm text-gray-500 mb-6">
                Su contraseña ha sido restablecida exitosamente. Ya puede iniciar sesion con su nueva contraseña.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors text-sm"
              >
                Ir al Login
              </button>
            </div>
          )}
        </div>

        <div className="text-center mt-4">
          <button
            onClick={() => navigate('/login')}
            className="text-sm text-blue-300 hover:text-white transition-colors"
          >
            Volver al inicio de sesion
          </button>
        </div>
      </div>
    </div>
  )
}
