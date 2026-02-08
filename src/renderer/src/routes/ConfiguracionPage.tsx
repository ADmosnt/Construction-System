// src/renderer/src/routes/ConfiguracionPage.tsx

import { useState } from 'react'
import Header from '../components/layout/Header'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { showToast } from '../components/ui/Toast'
import { useAuth } from '../context/AuthContext'
import { db } from '../lib/database'
import { SECURITY_QUESTIONS } from './SetupWizardPage'

export default function ConfiguracionPage() {
  const { user, logout } = useAuth()

  // Cambiar contraseña
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  // Cambiar preguntas de seguridad
  const [showQuestionsModal, setShowQuestionsModal] = useState(false)
  const [qCurrentPassword, setQCurrentPassword] = useState('')
  const [qPregunta1, setQPregunta1] = useState('')
  const [qRespuesta1, setQRespuesta1] = useState('')
  const [qPregunta2, setQPregunta2] = useState('')
  const [qRespuesta2, setQRespuesta2] = useState('')
  const [questionsLoading, setQuestionsLoading] = useState(false)
  const [questionsError, setQuestionsError] = useState('')

  const handleChangePassword = async () => {
    setPasswordError('')

    if (!currentPassword) {
      setPasswordError('Ingrese su contraseña actual.')
      return
    }
    if (newPassword.length < 4) {
      setPasswordError('La nueva contraseña debe tener al menos 4 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas nuevas no coinciden.')
      return
    }
    if (currentPassword === newPassword) {
      setPasswordError('La nueva contraseña debe ser diferente a la actual.')
      return
    }

    try {
      setPasswordLoading(true)
      await db.auth.changePassword(user!.id, currentPassword, newPassword)
      showToast('Contraseña actualizada exitosamente', 'success')
      setShowPasswordModal(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setPasswordError(err.message || 'Error al cambiar la contraseña.')
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleChangeQuestions = async () => {
    setQuestionsError('')

    if (!qCurrentPassword) {
      setQuestionsError('Ingrese su contraseña para confirmar.')
      return
    }
    if (!qPregunta1 || !qRespuesta1.trim()) {
      setQuestionsError('Complete la primera pregunta y respuesta.')
      return
    }
    if (!qPregunta2 || !qRespuesta2.trim()) {
      setQuestionsError('Complete la segunda pregunta y respuesta.')
      return
    }
    if (qPregunta1 === qPregunta2) {
      setQuestionsError('Las dos preguntas deben ser diferentes.')
      return
    }

    try {
      setQuestionsLoading(true)
      await db.auth.changeSecurityQuestions({
        userId: user!.id,
        current_password: qCurrentPassword,
        pregunta_seguridad_1: qPregunta1,
        respuesta_1: qRespuesta1,
        pregunta_seguridad_2: qPregunta2,
        respuesta_2: qRespuesta2
      })
      showToast('Preguntas de seguridad actualizadas', 'success')
      setShowQuestionsModal(false)
      setQCurrentPassword('')
      setQPregunta1('')
      setQRespuesta1('')
      setQPregunta2('')
      setQRespuesta2('')
    } catch (err: any) {
      setQuestionsError(err.message || 'Error al actualizar las preguntas.')
    } finally {
      setQuestionsLoading(false)
    }
  }

  const preguntasDisponibles2 = SECURITY_QUESTIONS.filter(q => q !== qPregunta1)

  return (
    <div>
      <Header
        title="Configuracion"
        subtitle="Gestione su cuenta y las opciones del sistema"
      />

      <div className="p-8">
        {/* Info de la cuenta */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Informacion de la Cuenta</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-500">Usuario</p>
              <p className="font-medium text-lg mt-1">{user?.username}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Nombre Completo</p>
              <p className="font-medium text-lg mt-1">{user?.nombre_completo}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Rol</p>
              <span className="inline-block mt-1 px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-700">
                {user?.rol?.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Acciones de seguridad */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Seguridad</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-800">Contraseña</p>
                <p className="text-sm text-gray-500">Cambie su contraseña de acceso al sistema</p>
              </div>
              <Button onClick={() => { setShowPasswordModal(true); setPasswordError('') }}>
                Cambiar Contraseña
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-800">Preguntas de Seguridad</p>
                <p className="text-sm text-gray-500">Actualice sus preguntas para recuperacion de contraseña</p>
              </div>
              <Button variant="secondary" onClick={() => { setShowQuestionsModal(true); setQuestionsError('') }}>
                Cambiar Preguntas
              </Button>
            </div>
          </div>
        </div>

        {/* Sesion */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Sesion</h2>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-800">Cerrar sesion</p>
              <p className="text-sm text-gray-500">La sesion se cierra automaticamente tras 15 minutos de inactividad</p>
            </div>
            <Button variant="danger" onClick={logout}>
              Cerrar Sesion
            </Button>
          </div>
        </div>

        {/* Info del sistema */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Acerca del Sistema</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Version</p>
              <p className="font-medium">2.0.0</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Base de Datos</p>
              <p className="font-medium">SQLite 3</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Plataforma</p>
              <p className="font-medium">Electron + React</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Empresa</p>
              <p className="font-medium">Proig M&G</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Cambiar Contraseña */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="Cambiar Contraseña"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña actual</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Ingrese su contraseña actual"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimo 4 caracteres"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar nueva contraseña</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita la nueva contraseña"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {passwordError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{passwordError}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              className="flex-1"
              onClick={handleChangePassword}
              disabled={passwordLoading}
            >
              {passwordLoading ? 'Actualizando...' : 'Actualizar Contraseña'}
            </Button>
            <Button variant="ghost" onClick={() => setShowPasswordModal(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Cambiar Preguntas de Seguridad */}
      <Modal
        isOpen={showQuestionsModal}
        onClose={() => setShowQuestionsModal(false)}
        title="Cambiar Preguntas de Seguridad"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-yellow-800">
              <strong>Importante:</strong> Al cambiar las preguntas de seguridad, las anteriores dejaran de funcionar para la recuperacion de contraseña. Asegurese de recordar las nuevas respuestas.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña actual (para confirmar)</label>
            <input
              type="password"
              value={qCurrentPassword}
              onChange={(e) => setQCurrentPassword(e.target.value)}
              placeholder="Ingrese su contraseña"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <label className="block text-sm font-bold text-blue-800 mb-2">Pregunta de seguridad 1</label>
            <select
              value={qPregunta1}
              onChange={(e) => setQPregunta1(e.target.value)}
              className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
            >
              <option value="">Seleccionar pregunta...</option>
              {SECURITY_QUESTIONS.map((q, i) => (
                <option key={i} value={q}>{q}</option>
              ))}
            </select>
            <input
              type="text"
              value={qRespuesta1}
              onChange={(e) => setQRespuesta1(e.target.value)}
              placeholder="Su respuesta..."
              className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <label className="block text-sm font-bold text-blue-800 mb-2">Pregunta de seguridad 2</label>
            <select
              value={qPregunta2}
              onChange={(e) => setQPregunta2(e.target.value)}
              className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
            >
              <option value="">Seleccionar pregunta...</option>
              {preguntasDisponibles2.map((q, i) => (
                <option key={i} value={q}>{q}</option>
              ))}
            </select>
            <input
              type="text"
              value={qRespuesta2}
              onChange={(e) => setQRespuesta2(e.target.value)}
              placeholder="Su respuesta..."
              className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {questionsError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{questionsError}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              className="flex-1"
              onClick={handleChangeQuestions}
              disabled={questionsLoading}
            >
              {questionsLoading ? 'Actualizando...' : 'Actualizar Preguntas'}
            </Button>
            <Button variant="ghost" onClick={() => setShowQuestionsModal(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
