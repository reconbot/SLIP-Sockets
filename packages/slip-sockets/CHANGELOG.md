# slip-sockets

## 3.0.0

### Major Changes

- Change the SlipSocketPublisher constructor options because making the jwt is unecssary. Before you would do this:

  ```ts
  import { JWT, SlipSocketPublisher } from "slip-sockets";

  const jwt = new JWT({ jwtSecret: JWT_SECRET });
  const wsPublisher = new SlipSocketPublisher({ controlApi, jwt });
  ```

  Now you do this:

  ```ts
  import { SlipSocketPublisher } from "slip-sockets";

  const wsPublisher = new SlipSocketPublisher({
    controlApi,
    jwtSecret: JWT_SECRET,
  });
  ```

## 2.0.2

## 2.0.1

## 2.0.0

### Major Changes

- feb96df: Initial Release of client and cdk libraries.
