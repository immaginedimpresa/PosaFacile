import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export function PasswordField({
    id,
    value,
    onChange,
    newPassword = false,
    disabled = false,
}: {
    id: string
    value: string
    onChange: (value: string) => void
    newPassword?: boolean
    disabled?: boolean
}) {
    const [visible, setVisible] = useState(false)
    const [capsLock, setCapsLock] = useState(false)
    return (
        <div className="pf-auth-field">
            <label htmlFor={id}>
                {newPassword ? 'Scegli una password' : 'Password'}
            </label>
            <div className="pf-auth-password">
                <input
                    id={id}
                    name="password"
                    type={visible ? 'text' : 'password'}
                    autoComplete={
                        newPassword ? 'new-password' : 'current-password'
                    }
                    minLength={newPassword ? 6 : undefined}
                    required
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    onKeyUp={(event) =>
                        setCapsLock(event.getModifierState('CapsLock'))
                    }
                    onBlur={() => setCapsLock(false)}
                    disabled={disabled}
                    placeholder={
                        newPassword ? 'Almeno 6 caratteri' : 'La tua password'
                    }
                    aria-describedby={
                        newPassword || capsLock ? `${id}-hint` : undefined
                    }
                />
                <button
                    type="button"
                    aria-label={
                        visible ? 'Nascondi password' : 'Mostra password'
                    }
                    aria-pressed={visible}
                    onClick={() => setVisible(!visible)}
                    disabled={disabled}
                >
                    {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </div>
            {(newPassword || capsLock) && (
                <p id={`${id}-hint`} className="pf-auth-field-hint">
                    {capsLock
                        ? 'Il blocco maiuscole è attivo.'
                        : value.length >= 6
                          ? 'Lunghezza minima raggiunta. Usa una password unica.'
                          : 'Minimo 6 caratteri. Sceglila lunga e diversa dalle altre.'}
                </p>
            )}
        </div>
    )
}

export function GoogleMark() {
    return (
        <svg width="17" height="17" aria-hidden="true" viewBox="0 0 488 512">
            <path
                fill="currentColor"
                d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
            />
        </svg>
    )
}
