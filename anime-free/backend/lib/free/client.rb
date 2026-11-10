require "json"
require "digest"
require "fileutils"
require "open3"
require "logger"

# Free backend for the make-an-anime pipeline.
#
# Loaded when MV_BACKEND=free. It is prepended onto Fal::Client, so every step keeps calling the same
# submit / wait / get_json / upload / download methods, but no request ever reaches Fal:
#
#   * a request whose result is already in output/free/results/ is answered from disk;
#   * speech recognition runs at once on this machine (faster-whisper);
#   * every GPU request (images, video, voices, music, sound effects) is written to output/free/queue/
#     and Free::Deferred is raised. `rake free:kaggle` then runs the whole queue in one Kaggle GPU
#     session with open models and writes the results, after which the same gen:* task finds them.
#
# Files never leave the machine except inside that Kaggle session: an "upload" is a file:// URL.
module Free
  # Raised when a request was queued for the next Kaggle batch instead of being answered now.
  class Deferred < StandardError
    attr_reader :key

    def initialize(message, key: nil)
      super(message)
      @key = key
    end

    # Where the result will be stored once the batch has run. Recorded as a provisional url so that the steps that
    # depend on this one (keyframes on sheets, shots on keyframes) can be queued in the same Kaggle batch.
    def future_file(ext = "png") = File.expand_path(File.join("output", "free", "files", "#{key}.#{ext}"))
  end

  ROOT = File.expand_path("../..", __dir__)
  WORKER = File.join(ROOT, "tools", "python", "free_backend.py")
  EXIT_DEFERRED = 75

  def self.python
    ENV["MV_FREE_PYTHON"] || [File.join(ROOT, ".venv-free", "bin", "python"), "python3"].find { |p| p == "python3" || File.file?(p) }
  end

  # Results are keyed by the request and by FREE_TAKE, so a retake of an unchanged prompt is
  # `NEW_REQUEST=1 FREE_TAKE=2 ONLY=<item> FORCE=1 rake gen:<step>`.
  def self.key(endpoint_id, input)
    Digest::SHA256.hexdigest(JSON.generate([endpoint_id, input, ENV["FREE_TAKE"].to_s]))[0, 20]
  end

  def self.result_path(key) = File.join("output", "free", "results", "#{key}.json")

  module Backend
    def initialize(api_key: nil, logger: Logger.new($stderr), poll_interval: 0, timeout: 1800)
      @api_key = "free-backend"
      @logger = logger
      @poll_interval = poll_interval
      @timeout = timeout
    end

    def submit(endpoint_id, input)
      key = Free.key(endpoint_id, input)
      unless File.file?(Free.result_path(key))
        FileUtils.mkdir_p("output/free/tmp")
        request = File.join("output", "free", "tmp", "#{key}.request.json")
        File.write(request, JSON.generate(endpoint: endpoint_id, input: input))
        out, status = Open3.capture2e(Free.python, WORKER, "submit", request, key)
        if status.exitstatus == EXIT_DEFERRED
          raise Deferred.new("#{endpoint_id}: queued as #{key} for the next Kaggle batch (rake free:kaggle)", key: key)
        end
        raise Fal::Error, "free backend failed for #{endpoint_id}:\n#{out}" unless status.success? && File.file?(Free.result_path(key))
      end
      { "request_id" => key, "status_url" => key, "response_url" => key }
    end

    def wait(*) = true

    def get_json(key) = JSON.parse(File.read(Free.result_path(File.basename(key.to_s))))

    def result(_endpoint_id, request_id) = get_json(request_id)

    def upload(path, **) = "file://#{File.expand_path(path)}"

    def upload_uncached(path, **) = upload(path)

    def download(url, path)
      return super unless url.start_with?("file://")
      FileUtils.mkdir_p(File.dirname(path))
      FileUtils.cp(url.delete_prefix("file://"), path)
      logger.info("[free] #{url} -> #{path}")
      path
    end
  end
end

Fal::Client.prepend(Free::Backend)
