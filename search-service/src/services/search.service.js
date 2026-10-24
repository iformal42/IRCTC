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

      scheduel: [],
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

const searchService = {
  indexSchedule,
  indexTrainStation,
  indexStation,
};
export default searchService;
