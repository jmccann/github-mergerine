import { get } from 'lodash'
import { logDecide, logRun, trace } from './log'
import decide from './decide'
import merge from './merge'
import update from './update'
import { config, dry } from './config'

const runOne = async repo => {
  const decision = await decide(repo)

  const number = get(decision, 'result.pull.number')
  if (number) {
    logDecide(decision.action, number)
  } else {
    logDecide(decision.action)
  }

  if (dry) {
    logRun('dry mode, not acting...')
    return decision
  }

  logRun('acting...')

  try {
    if (decision.action === 'merge') {
      logRun('merging...')
      await merge(decision.result.pull, repo)
      logRun('...done merging')

      logRun('checking for any others to update...')

      // run again in case any immediate updates can be made after merging
      let postDecision
      try {
        postDecision = await runOne(repo)
      } catch (err) {
        trace(err)
        logRun('error executing post-merge decision', decision)
        console.error('error executing post-merge decision', postDecision)
      }

      logRun('...done checking for any others to update')
    } else if (decision.action === 'update') {
      logRun('updating...')
      await update(decision.result.pull)
      logRun('...done updating')
    }
  } catch (err) {
    trace(err)
    logRun('error executing decision', decision)
    console.error('error executing decision', decision)
  }

  logRun('...done acting')

  return decision
}

const run = async () => {
  const { repos } = config

  const decisions = []

  for (let repo of repos) {
    const decision = await runOne(repo)
    decisions.push(decision)
  }

  return decisions
}

export { runOne }

export default run
