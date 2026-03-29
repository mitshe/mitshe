export * from './on-task-completed.handler';
export * from './on-task-failed.handler';

import { OnTaskCompletedHandler } from './on-task-completed.handler';
import { OnTaskFailedHandler } from './on-task-failed.handler';

export const EventHandlers = [OnTaskCompletedHandler, OnTaskFailedHandler];
