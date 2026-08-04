export const useAppState = () => {
  return useState('app_state', () => ({
    name: 'AMMS'
  }))
}

