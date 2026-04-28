import 'react-native'

declare module 'react-native' {
  interface ViewProps {
    className?: string
    cssInterop?: boolean
  }
  interface TextProps {
    className?: string
    cssInterop?: boolean
  }
  interface TextInputProps {
    className?: string
    placeholderClassName?: string
  }
  interface ImagePropsBase {
    className?: string
    cssInterop?: boolean
  }
  interface ScrollViewProps {
    className?: string
    contentContainerClassName?: string
    indicatorClassName?: string
  }
  interface TouchableWithoutFeedbackProps {
    className?: string
    cssInterop?: boolean
  }
  interface KeyboardAvoidingViewProps {
    className?: string
    contentContainerClassName?: string
  }
  interface SwitchProps {
    className?: string
    cssInterop?: boolean
  }
}
