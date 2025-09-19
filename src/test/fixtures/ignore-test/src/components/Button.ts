// Good quality component code
export interface ButtonProps {
  label: string
  onClick: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary'
}

export function createButton(props: ButtonProps): HTMLButtonElement {
  const button = document.createElement('button')
  button.textContent = props.label
  button.disabled = props.disabled ?? false
  button.className = `button button--${props.variant ?? 'primary'}`
  button.addEventListener('click', props.onClick)

  return button
}