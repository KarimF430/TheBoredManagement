'use client'

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

interface StepIndicatorProps {
  currentStep: number
  totalSteps: number
  steps: { label: string; icon: React.ReactNode }[]
}

export default function StepIndicator({ currentStep, totalSteps, steps }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-1 mb-6">
      {steps.map((step, index) => {
        const stepNumber = index + 1
        const isCompleted = stepNumber < currentStep
        const isCurrent = stepNumber === currentStep
        const isUpcoming = stepNumber > currentStep

        return (
          <div key={index} className="flex items-center">
            {/* Step Circle */}
            <motion.div
              className={`
                relative flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold
                transition-colors duration-300
                ${isCompleted ? 'bg-emerald-500 text-white' : ''}
                ${isCurrent ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/30' : ''}
                ${isUpcoming ? 'bg-slate-800 text-slate-500' : ''}
              `}
              initial={false}
              animate={{
                scale: isCurrent ? 1.1 : 1,
              }}
              transition={{ duration: 0.2 }}
            >
              {isCompleted ? (
                <Check className="w-4 h-4" />
              ) : (
                <span>{stepNumber}</span>
              )}
              
              {/* Current step pulse */}
              {isCurrent && (
                <motion.div
                  className="absolute inset-0 rounded-full bg-blue-500"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.3, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
            </motion.div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div className="w-6 h-0.5 mx-1 bg-slate-850 rounded-full">
                <motion.div
                  className={`h-full rounded-full ${
                    isCompleted ? 'bg-emerald-500' : 'bg-slate-800'
                  }`}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: isCompleted ? 1 : 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  style={{ transformOrigin: 'left' }}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
