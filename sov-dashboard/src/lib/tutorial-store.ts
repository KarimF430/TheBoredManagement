'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface TutorialStore {
  isActive: boolean
  currentStep: number
  completedSteps: string[]
  hasCompletedTutorial: boolean
  startTutorial: () => void
  nextStep: () => void
  prevStep: () => void
  skipTutorial: () => void
  completeStep: (id: string) => void
  resetTutorial: () => void
  setStep: (step: number) => void
}

export const useTutorialStore = create<TutorialStore>()(
  persist(
    (set, get) => ({
      isActive: false,
      currentStep: 0,
      completedSteps: [],
      hasCompletedTutorial: false,

      startTutorial: () =>
        set({
          isActive: true,
          currentStep: 0,
          completedSteps: [],
        }),

      nextStep: () => {
        const { currentStep } = get()
        set({ currentStep: currentStep + 1 })
      },

      prevStep: () => {
        const { currentStep } = get()
        if (currentStep > 0) set({ currentStep: currentStep - 1 })
      },

      skipTutorial: () =>
        set({
          isActive: false,
          hasCompletedTutorial: true,
        }),

      completeStep: (id: string) => {
        const { completedSteps } = get()
        if (!completedSteps.includes(id)) {
          set({ completedSteps: [...completedSteps, id] })
        }
      },

      resetTutorial: () =>
        set({
          isActive: true,
          currentStep: 0,
          completedSteps: [],
          hasCompletedTutorial: false,
        }),

      setStep: (step: number) => set({ currentStep: step }),
    }),
    {
      name: 'sov-tutorial-state',
      partialize: (state) => ({
        completedSteps: state.completedSteps,
        hasCompletedTutorial: state.hasCompletedTutorial,
      }),
    }
  )
)
