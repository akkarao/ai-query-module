package com.aiquery.dashboard;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.bson.Document;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.UUID;

@Service
public class QueryService {
  private final MongoTemplate mongoTemplate;
  private final ObjectMapper objectMapper;
  private final RestClient restClient;
  private final String apiKey;
  private final String model;
  private final String collection;
  private final String savedCardsCollection;
  private static final Pattern MORE_THAN_YEAR = Pattern.compile("(?:more than|over|last|past|older than)\\s+(\\d+)\\s*(?:year|years|yr|yrs)", Pattern.CASE_INSENSITIVE);
  private static final Pattern MORE_THAN_MONTHS = Pattern.compile("(?:more than|over|last|past|older than)\\s+(\\d+)\\s*(?:month|months|mo|mos)", Pattern.CASE_INSENSITIVE);
  private static final String ANALYSIS_PROMPT = """
      ROLE
      You are a domain-neutral data analysis and rendering engine. Answer questions about payments, banking, development, testing, BA, BSA, operations, compliance, or any other domain using only the supplied records.

      NON-NEGOTIABLE OUTPUT RULES
      1. Return exactly one valid JSON object.
      2. Return no markdown fences, prose outside JSON, HTML, JSX, JavaScript, SQL, or executable code.
      3. The root `type` must be exactly one of: text, metric, table, bar, stackedBar, line, area, pie, scatter, histogram.
      4. Never invent facts. Use `null` only when the source value is genuinely null.
      5. Preserve exact identifiers, dates, amounts, currencies, statuses, errors, reasons, parties, controls, and related records.

      ANALYSIS WORKFLOW
      1. Identify the user's requested subject, filters, time range, environment, message type, status, and comparison dimensions.
      2. Use only matching records from the supplied data and logs.
      3. Calculate totals, counts, averages, rates, trends, and comparisons from the records when requested.
      4. Distinguish observed facts from interpretation. State when no matching data exists.
      5. Select the output type only after understanding the question and data shape.

      NORMAL TEXT OUTPUT
      Use `type: "text"` for normal questions. Preserve every material result; do not omit fields to make the response shorter.
      Use this shape, adding fields when needed:
      {"type":"text","title":"Short heading","summary":"Complete concise answer","bullets":["Finding"],"details":[{"label":"Field or metric","value":"Value"}],"sections":[{"heading":"Section","items":[{"label":"Field","value":"Value"}]}],"dataSources":["Collection or log source"]}
      Put additional facts in `bullets`, `details`, `sections`, or clearly named top-level fields. Include relevant time ranges, environments, teams, processes, message types, units, and currencies. Keep exact values and identifiers visible.

      METRIC AND TABLE OUTPUT
      Use `metric` only for a single requested KPI. Include `value`, `unit`, and `description`.
      Use `table` for requested rows or multi-field record output. Include `columns` and `rows`, preserving all requested fields.

      CHART OUTPUT
      Use a chart only when requested or when it materially improves the answer. If the user names a chart type, use that exact type.
      Every chart MUST include:
      {"type":"line|bar|stackedBar|area|pie|scatter|histogram","data":[{}],"xKey":"actual field","yKey":"actual numeric field","xAxisLabel":"human-readable X field and unit","yAxisLabel":"human-readable Y field and unit","metricDescription":"what the measure means"}
      Chart rules:
      - `data` must be an array of objects from the supplied records or calculations.
      - `xKey` and `yKey` must be actual keys present in every data object. Never use placeholder keys such as `name` or `value` unless they exist.
      - Use a date/time field for `xKey` for trends over time.
      - Use the requested category or dimension for `xKey` for comparisons.
      - Use a numeric count, amount, rate, percentage, or other numeric measure for `yKey`.
      - For `scatter`, both axes must be numeric.
      - For `pie`, `xKey` is the category and `yKey` is the numeric measure.
      - For multiple measures, include `yKeys` with actual numeric keys and describe every series in `metricDescription`.
      - Keep chart dates in ISO format and chart numbers numeric, not formatted strings.
      - Use `bar` for category comparison, `stackedBar` for composition, `line` for time trends, `area` for cumulative/time volume, `pie` for shares, `scatter` for numeric correlation, and `histogram` for numeric distribution.

      DATA CONTEXT
      User query: %s
      Payment records from MongoDB, default time window one month: %s
      Operational logs, included for issue/failure questions: %s
      """;

  public QueryService(MongoTemplate mongoTemplate, ObjectMapper objectMapper,
                      @Value("${ai.base-url}") String baseUrl,
                      @Value("${ai.api-key}") String apiKey,
                      @Value("${ai.model}") String model,
                      @Value("${ai.collection}") String collection,
                      @Value("${ai.saved-cards-collection:saved_cards}") String savedCardsCollection) {
    this.mongoTemplate = mongoTemplate;
    this.objectMapper = objectMapper;
    this.restClient = RestClient.builder().baseUrl(baseUrl).build();
    this.apiKey = apiKey;
    this.model = model;
    this.collection = collection;
    this.savedCardsCollection = savedCardsCollection;
  }

  public Object answer(String query) {
    String normalizedQuery = normalize(query);
    Integer requestedYears = requestedYears(query);
    if (requestedYears != null && requestedYears > 1) {
      return textResponse("Query restricted", "Queries over one year are not allowed. Narrow the time range to one year or less before running it.");
    }
    Document savedCard = findSavedCard(normalizedQuery);
    if (savedCard != null && savedCard.get("spec") instanceof Map<?, ?> savedSpec) {
      return new HashMap<>((Map<String, Object>) savedSpec);
    }
    List<Document> paymentContext = loadPaymentContext();
    List<Document> operationalLogs = isIssueQuestion(query) ? loadOperationalLogs() : List.of();
    if (apiKey.isBlank()) return textResponse("AI configuration needed", "Add AI_API_KEY to generate a live insight from your MongoDB data.");
    try {
      String prompt = ANALYSIS_PROMPT.formatted(query, objectMapper.writeValueAsString(paymentContext), objectMapper.writeValueAsString(operationalLogs));
          Map<String, Object> body = Map.of("model", model, "messages", List.of(Map.of("role", "user", "content", prompt)));
      String response = restClient.post().uri("/chat/completions").contentType(MediaType.APPLICATION_JSON).header("Authorization", "Bearer " + apiKey).body(body).retrieve().body(String.class);
      JsonNode content = objectMapper.readTree(response).path("choices").path(0).path("message").path("content");
      Map<String, Object> renderSpec = objectMapper.readValue(stripFences(content.asText()), new TypeReference<Map<String, Object>>() {});
      String requestedType = requestedChartType(query);
      if (requestedType != null && renderSpec.containsKey("data")) renderSpec.put("type", requestedType);
      return renderSpec;
    } catch (Exception exception) {
      return textResponse("Query unavailable", "The query could not be rendered. Check the model, MongoDB connection, and API logs.");
    }
  }

  @PostConstruct
  void ensureMongoCollections() {
    List.of(collection, savedCardsCollection).stream()
        .distinct()
        .forEach(this::ensureMongoCollection);
  }

  private void ensureMongoCollection(String collectionName) {
    try {
      if (!mongoTemplate.collectionExists(collectionName)) {
        mongoTemplate.createCollection(collectionName);
      }
    } catch (Exception exception) {
      // MongoDB may be unavailable during startup; query operations already fail closed.
    }
  }

  public List<Document> savedCards() {
    return mongoTemplate.findAll(Document.class, savedCardsCollection);
  }

  public Document saveCard(String title, String query, Map<String, Object> spec) {
    Document card = new Document("cardId", UUID.randomUUID().toString()).append("title", title).append("query", query)
        .append("normalizedQuery", normalize(query)).append("spec", spec)
        .append("savedAt", Instant.now().toString());
    mongoTemplate.save(card, savedCardsCollection);
    return card;
  }

  public void deleteCard(String id) {
    mongoTemplate.remove(new Query(Criteria.where("cardId").is(id)), savedCardsCollection);
  }

  private List<Document> loadPaymentContext() {
    try {
      String from = LocalDate.now(ZoneOffset.UTC).minusMonths(1).atStartOfDay().toInstant(ZoneOffset.UTC).toString();
      return mongoTemplate.find(new Query(Criteria.where("creationDateTime").gte(from)).limit(200), Document.class, collection);
    } catch (Exception exception) {
      return List.of();
    }
  }

  private List<Document> loadOperationalLogs() {
    try (var stream = getClass().getResourceAsStream("/operational-logs.log")) {
      if (stream == null) return List.of();
      try (var reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
        return reader.lines()
            .filter(line -> !line.isBlank() && !line.startsWith("#"))
            .map(this::parseOperationalLog)
            .toList();
      }
    } catch (Exception exception) {
      return List.of();
    }
  }

  private Document parseOperationalLog(String line) {
    String[] fields = line.split("\\|", 5);
    return new Document("timestamp", fields[0])
        .append("level", fields[1])
        .append("service", fields[2])
        .append("transactionId", fields[3])
        .append("message", fields.length == 5 ? fields[4] : "");
  }

  private Document findSavedCard(String normalizedQuery) {
    try {
      return mongoTemplate.findOne(new Query(Criteria.where("normalizedQuery").is(normalizedQuery)), Document.class, savedCardsCollection);
    } catch (Exception exception) {
      return null;
    }
  }

  private boolean isIssueQuestion(String query) {
    return query.toLowerCase().matches(".*\\b(fail|failed|failure|error|issue|declined|rejected|why)\\b.*");
  }

  private Integer requestedYears(String query) {
    Matcher matcher = MORE_THAN_YEAR.matcher(query);
    if (matcher.find()) return Integer.valueOf(matcher.group(1));
    Matcher monthMatcher = MORE_THAN_MONTHS.matcher(query);
    if (monthMatcher.find() && Integer.parseInt(monthMatcher.group(1)) > 12) return 2;
    return null;
  }

  private String normalize(String query) {
    return query.trim().replaceAll("\\s+", " ").toLowerCase();
  }

  private Map<String, Object> textResponse(String title, String summary) {
    return Map.of("type", "text", "title", title, "summary", summary);
  }

  private String requestedChartType(String query) {
    String normalized = query.toLowerCase();
    if (normalized.contains("histogram") || normalized.contains("numeric distribution")) return "histogram";
    if (normalized.contains("scatter plot") || normalized.contains("scatter chart") || normalized.contains("correlation")) return "scatter";
    if (normalized.contains("pie chart") || normalized.contains("pie graph") || normalized.contains("share") || normalized.contains("proportion")) return "pie";
    if (normalized.contains("stacked bar")) return "stackedBar";
    if (normalized.contains("line chart") || normalized.contains("line graph") || normalized.contains("trend") || normalized.contains("over time")) return "line";
    if (normalized.contains("area chart") || normalized.contains("area graph") || normalized.contains("cumulative")) return "area";
    if (normalized.contains("bar chart") || normalized.contains("bar graph") || normalized.contains("category comparison")) return "bar";
    return null;
  }

  private String stripFences(String content) {
    return content.replaceFirst("^```(?:json)?\\s*", "").replaceFirst("\\s*```$", "").trim();
  }
}