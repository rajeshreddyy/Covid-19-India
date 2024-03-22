const express = require('express')
const path = require('path')
const app = express()

app.use(express.json())

const {open} = require('sqlite')
const sqlite3 = require('sqlite3')

const dbPath = path.join(__dirname, 'covid19India.db')

let db = null
const initializeDatabaseAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server is started at http://localhost:3000')
    })
  } catch (err) {
    console.log(`Database Error: ${err}`)
    process.exit(1)
  }
}
initializeDatabaseAndServer()

// API 1 (Returns a list of all states in the state table)
app.get('/states/', async (request, response) => {
  const getAllStatesQuery = `
    SELECT
        *
    FROM
        state   
    `
  const statesArray = await db.all(getAllStatesQuery)
  response.send(
    statesArray.map(eachState => {
      return {
        stateId: eachState.state_id,
        stateName: eachState.state_name,
        population: eachState.population,
      }
    }),
  )
})

//API 2 (Returns a state based on the state ID)
app.get('/states/:stateId/', async (request, response) => {
  const {stateId} = request.params
  const getStateQuery = `
    SELECT
      *
    FROM
      state
    WHERE
      state_id = ${stateId};
  `
  const stateDetailsDbObj = await db.get(getStateQuery)
  const stateDetails = {
    stateId: stateDetailsDbObj.state_id,
    stateName: stateDetailsDbObj.state_name,
    population: stateDetailsDbObj.population,
  }
  response.send(stateDetails)
})

// API 3 (Create a district in the district table)
app.post('/districts/', async (request, response) => {
  const {districtName, stateId, cases, cured, active, deaths} = request.body
  const addDistrictQuery = `
    INSERT INTO
      district(district_name, state_id, cases, cured, active, deaths)
    VALUES
      (
        '${districtName}',
        '${stateId}',
        '${cases}',
        '${cured}',
        '${active}',
        '${deaths}'
      );
    
  `
  await db.run(addDistrictQuery)
  response.send('District Successfully Added')
})

// API 4 (Returns a district based on the district ID)
app.get('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const getDistrictQuery = `
    SELECT
      *
    FROM
      district
    WHERE
      district_id= ${districtId};
  `
  const dbResponse = await db.get(getDistrictQuery)
  if (dbResponse === undefined) {
    response.status(400)
    response.send('District not found')
  } else {
    const districtDetails = {
      districtId: dbResponse.district_id,
      districtName: dbResponse.district_name,
      stateId: dbResponse.state_id,
      cases: dbResponse.cases,
      cured: dbResponse.cured,
      active: dbResponse.active,
      deaths: dbResponse.deaths,
    }
    response.send(districtDetails)
  }
})

// API 5 (Deletes a district from the district table based on the district ID)
app.delete('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params

  const deleteDistrictQuery = `
    DELETE FROM
      district
    WHERE
      district_id = ${districtId};
  `

  await db.run(deleteDistrictQuery)
  response.send('District Removed')
})

// API 6 (Updates the details of a specific district based on the district ID)
app.put('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const {districtName, stateId, cases, cured, active, deaths} = request.body
  const updateDistrictQuery = `
    UPDATE 
      district
    SET
      district_name = '${districtName}',
      state_id = '${stateId}',
      cases = '${cases}',
      cured = '${cured}',
      active = '${active}',
      deaths = '${deaths}'
    WHERE
      district_id = '${districtId}';
  `
  await db.run(updateDistrictQuery)
  response.send('District Details Updated')
})

//API 7 (Returns the statistics of total cases, cured, active, deaths of a specific state based on state ID)
app.get('/states/:stateId/stats/', async (request, response) => {
  const {stateId} = request.params
  const getStatsQuery = `
    SELECT
      *
    FROM
      district
    WHERE
      state_id = ${stateId};
  `
  const dbResponse = await db.all(getStatsQuery)

  let totalCases = 0
  let totalCured = 0
  let totalActive = 0
  let totalDeaths = 0

  dbResponse.map(each => {
    totalCases += each.cases
    totalCured += each.cured
    totalActive += each.active
    totalDeaths += each.deaths
  })
  const stats = {totalCases, totalCured, totalActive, totalDeaths}
  response.send(stats)
})

// API 8 (Returns an object containing the state name of a district based on the district ID)
app.get('/districts/:districtId/details/', async (request, response) => {
  const {districtId} = request.params
  const getStateQuery = `
    SELECT
      state_id
    FROM
      district
    WHERE
      district_id = ${districtId};
  `
  const stateId = await db.get(getStateQuery)

  const getStateName = `
    SELECT
      state_name
    FROM
      state
    WHERE
      state_id = ${stateId.state_id};
  `
  const stateName = await db.get(getStateName)
  response.send({stateName: stateName.state_name})
})

module.exports = app
