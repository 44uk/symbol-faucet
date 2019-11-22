import { retryWhen, concatMap } from "rxjs/operators"
import { timer, throwError } from "rxjs"

export const retryWithDelay = <T>({ attempts = 9, delay = 1000 } = {}) => (
  retryWhen<T>(errors => errors.pipe(
    concatMap((e, idx) => (
      idx < attempts ?
        timer(idx * delay) :
        throwError(e)
    ))
  ))
)
