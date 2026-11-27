// Fixed fictional data. Do not modify at runtime.
export const CURRENT_TIME = "2026-01-05T09:00:00";

export interface Booking {
  id: string;
  start: string; // ISO datetime
  end: string; // ISO datetime
  title: string;
}

export const ROOM = {
  id: "SC-204",
  name: "Seminar Room SC-204",
  capacity: 32,
  floor: "2nd floor, Science Building",
};

export const BOOKINGS: readonly Booking[] = [
  {
    id: "b1",
    start: "2026-01-05T10:00:00",
    end: "2026-01-05T11:00:00",
    title: "Linear Algebra Lecture",
  },
  {
    id: "b2",
    start: "2026-01-05T13:00:00",
    end: "2026-01-05T14:00:00",
    title: "Study Group",
  },
];
