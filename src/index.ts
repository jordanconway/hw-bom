#!/usr/bin/env ts-node
import {execSync} from 'child_process'
import * as core from '@actions/core'

async function getAwsToken(): Promise<string> {
  try {
    const response = await fetch('http://169.254.169.254/latest/api/token', {
      method: 'PUT',
      headers: {'X-aws-ec2-metadata-token-ttl-seconds': '21600'}
    })
    return await response.text()
  } catch (error) {
    console.error('Failed to fetch AWS token:', error)
    return ''
  }
}

async function getInstanceType(
  cloud: string,
  awsToken: string = ''
): Promise<string> {
  try {
    switch (cloud) {
      case 'aws': {
        const awsResponse = await fetch(
          'http://169.254.169.254/latest/meta-data/instance-type',
          {headers: {'X-aws-ec2-metadata-token': awsToken}}
        )
        return await awsResponse.text()
      }
      case 'azure': {
        const azureResponse = await fetch(
          'http://169.254.169.254/metadata/instance/compute/vmSize?api-version=2021-01-01&format=json',
          {headers: {Metadata: 'true'}}
        )
        const azureData = await azureResponse.json()
        return azureData
      }
      case 'gce': {
        const gceResponse = await fetch(
          'http://metadata.google.internal/computeMetadata/v1/instance/machine-type',
          {headers: {'Metadata-Flavor': 'Google'}}
        )
        return await gceResponse.text()
      }
      default:
        return 'Unknown Instance Type'
    }
  } catch (error) {
    console.error(`Failed to fetch instance type for ${cloud}:`, error)
    return 'Error fetching instance type'
  }
}

function runCommand(command: string): string {
  try {
    return execSync(command).toString().trim()
  } catch (error) {
    console.error(`Command failed: ${command}`, error)
    return 'Error executing command'
  }
}

async function run(): Promise<void> {
  try {
    const cloud = runCommand('cloud-init query cloud-name')
    const awsToken = cloud === 'aws' ? await getAwsToken() : ''
    const instanceType = await getInstanceType(cloud, awsToken)
    const uname = runCommand('uname -a')
    const display = runCommand('sudo lshw -C display')
    const cpu = runCommand(
      'cat /proc/cpuinfo |grep "model name"|sort -u|cut -d ":" -f2|awk \'{$1=$1};1\''
    )
    const cpuVendor = runCommand("lscpu | grep Vendor | awk '{print $NF}'")
    const cpuNumProc = runCommand('getconf _NPROCESSORS_ONLN')
    const hostname = runCommand('hostname')
    const gpuVendor = runCommand(
      'sudo lshw -C display|grep vendor|cut -d ":" -f2|awk \'{$1=$1};1\''
    )
    const gpuModel = runCommand(
      'sudo lshw -C display|grep product|cut -d ":" -f2|awk \'{$1=$1};1\''
    )
    const memTotal = runCommand(
      "grep MemTotal /proc/meminfo|awk '{print $(NF-1),$NF}'"
    )
    const diskTotal = runCommand("df -h --total | awk 'END{print $2}'")
    const diskUsed = runCommand("df -h --total | awk 'END{print $3}'")
    const diskFree = runCommand("df -h --total | awk 'END{print $4}'")

    console.log('~~~~~ HWINFO STUFF~~~~~~')
    console.log('Cloud Provider:')
    console.log(` ${cloud}`)
    console.log('Instance Type:')
    console.log(` ${instanceType}`)
    console.log('')
    console.log('hostname:')
    console.log(` ${hostname}`)
    console.log('')
    console.log('uname info:')
    console.log(` ${uname}`)
    console.log('')
    console.log('Display info:')
    console.log(` ${display}`)
    console.log('')
    console.log('Cpu Model:')
    console.log(` ${cpu}`)
    console.log('')
    console.log('Number of processors:')
    console.log(` ${cpuNumProc}`)
    console.log('')
    console.log('CPU Vendor:')
    console.log(` ${cpuVendor}`)
    console.log('')
    console.log('GPU Vendor:')
    console.log(` ${gpuVendor}`)
    console.log('')
    console.log('GPU Model:')
    console.log(` ${gpuModel}`)
    console.log('')
    console.log('Memory Total:')
    console.log(` ${memTotal}`)
    console.log('')
    console.log('Disk Total:')
    console.log(` ${diskTotal}`)
    console.log('')
    console.log('Disk Used:')
    console.log(` ${diskUsed}`)
    console.log('')
    console.log('Disk Free:')
    console.log(` ${diskFree}`)
    console.log('')
    console.log('~~~~~~~~~~~~~~~~~~~~~~~~')
    core.setOutput('cloud', cloud)
    core.setOutput('instanceType', instanceType)
    core.setOutput('uname', uname)
    core.setOutput('display', display)
    core.setOutput('cpu', cpu)
    core.setOutput('cpuVendor', cpuVendor)
    core.setOutput('cpuNumProc', cpuNumProc)
    core.setOutput('hostname', hostname)
    core.setOutput('gpuVendor', gpuVendor)
    core.setOutput('gpuModel', gpuModel)
    core.setOutput('memTotal', memTotal)
    core.setOutput('diskTotal', diskTotal)
    core.setOutput('diskUsed', diskUsed)
    core.setOutput('diskFree', diskFree)
  } catch (error) {
    core.setFailed(`Action failed with error: ${error}`)
  }
}

run()
