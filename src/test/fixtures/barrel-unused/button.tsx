import React from 'react'

export interface ButtonProps {
  variant?: 'default' | 'destructive'
  size?: 'default' | 'sm' | 'lg'
}

export const Button: React.FC<ButtonProps> = ({ variant = 'default', size = 'default' }) => {
  return <button className={`btn btn-${variant} btn-${size}`}>Button</button>
}

export const buttonVariants = {
  default: 'bg-primary',
  destructive: 'bg-destructive'
}