import {
  esClient,
  STATION_INDEX,
  TRAIN_INDEX,
} from "../config/elasticsSearch.js";
import logger from "../config/logger.js";

const indexStation = async (event) => {
  const station = event.data;
  if (!station) return;

  try {
    await esClient.index({
      index: STATION_INDEX,
      id: station.id,
      document: {
        stationId: station.id,
        name: station.name,
        code: station.code,
        city: station.city,
        suggest: {
          input: [station.name, station.code, station.city].filter(Boolean),
          weight: 10,
        },
      },
      refresh: true,
    });
    logger.info(`Station indexed ${station.name} ${station.code}`);
  } catch (error) {
    logger.error(`Failed to index  station ${error.message}`);
  }
};

const indexTrainStation = async (event) => {
  const { train, routeStations } = event.data;
  if (!train || !routeStations) return;
  try {
    const seatSummary = {
      total: 0,
      LOWER: 0,
      UPPER: 0,
      MIDDLE: 0,
      SIDE_LOWER: 0,
      SIDE_UPPER: 0,
    };

    (train.seats || []).forEach((seat) => {
      if (seatSummary[seat.seatType] !== undefined) {
        seatSummary[seat.seatType]++;
      }
    });

    seatSummary.total = train.seats.length;

    const document = {
      trainId: train.id,
      trainNumber: train.trainNumber,
      trainName: train.trainName,
      route: routeStations.map((rs) => ({
        stationId: rs.stationId,
        stationName: rs.station.name,
        stationCode: rs.station.code,
        sequenceNumber: rs.sequenceNumber,
        arrivalTime: rs.arrivalTime,
        depatureTime: rs.departureTime,
        distanceFromOrigin: rs.distanceFromOrigin,
      })),

      schedules: [],
      seatSummary,
    };
    await esClient.index({
      index: TRAIN_INDEX,
      id: train.id,
      document,
      refresh: true,
    });
    for (const rs of routeStations) {
      const station = rs.station;
      const event = { data: station };
      await indexStation(event);
    }
    logger.info(
      `Indexed train ${train.trainNumber} with ${routeStations.length} stations`,
    );
  } catch (error) {
    logger.error(`Failed to create Indexed of train ${train.trainNumber}`, {
      error,
    });
  }
};

const indexSchedule = async (scheduleEvent) => {
  const { id, train, seats, schedule } = scheduleEvent.data;
  const scheduleId = id;
  const trainId = train.id;
  const { departureDate, status } = schedule;
  const totalSeats = seats ? seats.length : 0;

  try {
    await esClient.update({
      index: TRAIN_INDEX,
      id: trainId,
      script: {
        source: `
            if (ctx._source.schedules == null) { ctx._source.schedules = []; }
            // Remove existing schedule with same id (idempotent)
            ctx._source.schedules.removeIf(s -> s.scheduleId == params.scheduleId);
            ctx._source.schedules.add(params.newSchedule);
          `,
        params: {
          scheduleId,
          newSchedule: {
            scheduleId,
            departureDate,
            status,
            available: totalSeats,
            locked: 0,
            booked: 0,
          },
        },
      },
      refresh: true,
    });
    logger.info(`Indexed schedule ${scheduleId} for train ${trainId}`);
  } catch (err) {
    logger.warn(
      `Could not index schedule for train ${trainId}: ${err.message}`,
    );
  }
};

const searchStations = async ({ from, to, date }) => {
  const fromStation = await resolveStation(from);
  const toStation = await resolveStation(to);
  if (!fromStation) {
    return { from, message: `${from} didn't find any match`, train: [] };
  }
  if (!toStation) {
    return { to, message: `${to} didn't find any match`, train: [] };
  }
  const query = {
    bool: {
      must: [
        {
          nested: {
            path: "route",
            query: { term: { "route.stationId": fromStation.stationId } },
            inner_hits: { name: "from_station" },
          },
        },
        {
          nested: {
            path: "route",
            query: { term: { "route.stationId": toStation.stationId } },
            inner_hits: { name: "to_station" },
          },
        },
      ],
    },
  };

  const result = await esClient.search({
    index: TRAIN_INDEX,
    query,
    size: 50,
  });

  const normalize = (d) => new Date(d).toISOString().slice(0, 10);

  const trains = result.hits.hits
    .map((hit) => {
      const src = hit._source;
      const fromHit = hit.inner_hits.from_station.hits.hits[0]._source;
      const toHit = hit.inner_hits.to_station.hits.hits[0]._source;
      if (
        !fromHit ||
        !toHit ||
        fromHit.sequenceNumber >= toHit.sequenceNumber
      ) {
        return null;
      }
      let scheduleInfo = null;
      if (date && src.schedules && src.schedules.length) {
        scheduleInfo =
          src.schedules.find(
            (s) => s.status === "ACTIVE" && normalize(s.departureDate) === date,
          ) || null;
      }
      return {
        trainName: src.trainName,
        trainId: src.trainId,
        trainNumber: src.trainNumber,
        from: {
          name: fromHit.stationName,
          code: fromHit.stationCode,
          departureTime: fromHit.departureTime,
        },
        to: {
          name: toHit.stationName,
          code: toHit.stationCode,
          departureTime: toHit.departureTime,
        },
        seatSummary: src.seatSummary,
        schedule: scheduleInfo,
      };
    })
    .filter(Boolean);

  return {
    from: { resolved: fromStation.name, code: fromStation.code },
    to: { resolved: toStation.name, code: toStation.code },
    date: date || "any",
    trains,
  };
};

const resolveStation = async (input) => {
  const exactResults = await esClient.search({
    index: STATION_INDEX,
    query: {
      term: { code: input.toUpperCase() },
    },
    size: 1,
  });
  if (exactResults.hits.hits.length) {
    return exactResults.hits.hits[0]._source;
  }
  try {
    const suggest = await esClient.search({
      index: STATION_INDEX,
      suggest: {
        station_suggest: {
          prefix: input,
          completion: {
            field: "suggest",
            fuzzy: { fuzziness: "AUTO" },
            size: 1,
          },
        },
      },
    });

    const options = suggest.suggest?.station_suggest?.[0]?.options || [];

    if (options.length) {
      return options[0]._source;
    }
  } catch (error) {
    logger.warn(`Sugges fallback failed:${error.message}`);
  }

  const fuzzyResults = await esClient.search({
    index: STATION_INDEX,
    query: {
      multi_match: {
        query: input,
        fields: ["name", "city"],
        fuzziness: "AUTO",
        prefix_length: 1,
      },
    },
    size: 1,
  });

  return fuzzyResults.hits.hits.length
    ? fuzzyResults.hits.hits[0]._source
    : null;
};

const autoCompleteStation = async (prefix) => {
  const results = await esClient.search({
    index: STATION_INDEX,
    suggest: {
      station_suggest: {
        prefix,
        completion: {
          field: "suggest",
          fuzzy: { fuzziness: "AUTO" },
          size: 10,
        },
      },
    },
  });
  const options = results.suggest.station_suggest[0]?.options || [];
  return options.map((st) => ({
    name: st._source.name,
    code: st._source.code,
    stationId: st._source.stationId,
  }));
};
const searchService = {
  indexSchedule,
  indexTrainStation,
  indexStation,
  searchStations,
  autoCompleteStation,
};
export default searchService;
