import { LearningAlgorithm } from "./learning_algorithm";
import { SM2Algorithm } from "./sm2";
import { FSRSAlgorithm } from "./fsrs";
import { AlgorithmName } from "./types";

export class LearningAlgorithmFactory {
  private static algorithms: Map<AlgorithmName, LearningAlgorithm> = new Map([
    ["SM2", new SM2Algorithm()],
    ["FSRS", new FSRSAlgorithm()],
  ]);

  /**
   * Returns the algorithm instance for the specified algorithm type.
   * Defaults to SM2 if unspecified or unknown.
   */
  public static getAlgorithm(algorithmName?: string | null): LearningAlgorithm {
    const key = (algorithmName?.toUpperCase() ?? "SM2") as AlgorithmName;
    const algorithm = this.algorithms.get(key);
    if (!algorithm) {
      return this.algorithms.get("SM2")!;
    }
    return algorithm;
  }
}
