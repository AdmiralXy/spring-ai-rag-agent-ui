import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.css'

export default defineNuxtPlugin(() => {
  return {
    provide: {
      hljs
    }
  }
})
